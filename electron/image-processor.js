const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { Blob } = require('buffer'); // Node.js Blob
const { removeBackground } = require('@imgly/background-removal-node');
const { optimizeFilenameForSEO } = require('./seo-helper');
const { SIZE_PRESETS } = require('./size-presets');

/**
 * Process a single image
 * @param {string} inputPath - Path to source image
 * @param {string} outputDir - Directory to save processed image
 * @param {object} options - Processing options
 */
async function processImage(inputPath, outputDir, options) {
    try {
        const {
            resizeWidth,
            resizeHeight,
            fit = 'cover', // cover, contain, fill, inside, outside
            watermarkPath,
            watermarkText,
            format = 'jpeg',
            quality = 80
        } = options;

        // Auto-detect output directory if not provided
        if (!outputDir) {
            outputDir = path.join(path.dirname(inputPath), 'processed');
        }

        // Ensure output dir exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let inputData = inputPath;

        // --- AI 一键抠图 (Background Removal) ---
        if (options.removeBackground) {
            try {
                console.log('Starting background removal for:', inputPath);

                // 修复 Windows 路径问题: 读取文件为 Buffer 并创建 Blob
                const fileBuffer = fs.readFileSync(inputPath);

                // 根据文件扩展名确定 MIME 类型
                const ext = path.extname(inputPath).toLowerCase();
                const mimeTypes = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.webp': 'image/webp',
                    '.gif': 'image/gif',
                    '.bmp': 'image/bmp'
                };
                const mimeType = mimeTypes[ext] || 'image/jpeg';

                // 创建 Blob 对象
                const blob = new Blob([fileBuffer], { type: mimeType });

                // 调用 removeBackground
                const resultBlob = await removeBackground(blob);
                const arrayBuffer = await resultBlob.arrayBuffer();
                inputData = Buffer.from(arrayBuffer);

                console.log('Background removal successful');
            } catch (error) {
                console.error('Background removal failed:', error);
                console.error('Error details:', error.message);
                // Fallback to original image if background removal fails
                inputData = inputPath;
            }
        }

        let pipeline = sharp(inputData);
        const originalMetadata = await pipeline.metadata();

        // 1. Crop & Resize
        let targetWidth = resizeWidth ? parseInt(resizeWidth) : null;
        let targetHeight = resizeHeight ? parseInt(resizeHeight) : null;
        let resizeFit = fit;

        if (options.cropEnabled && options.cropRatio && options.cropRatio !== 'free') {
            resizeFit = 'cover'; // Force cover for aspect ratio crop

            // If no target size specified, use original dimensions to maintain quality
            if (!targetWidth && !targetHeight) {
                targetWidth = originalMetadata.width;
                targetHeight = originalMetadata.height;
            }

            // Adjust dimensions to match ratio
            if (options.cropRatio === '1:1') {
                const size = Math.min(targetWidth || originalMetadata.width, targetHeight || originalMetadata.height);
                targetWidth = size;
                targetHeight = size;
            } else if (options.cropRatio === '16:9') {
                if (targetWidth) targetHeight = Math.round(targetWidth * 9 / 16);
                else if (targetHeight) targetWidth = Math.round(targetHeight * 16 / 9);
                else {
                    targetWidth = originalMetadata.width;
                    targetHeight = Math.round(targetWidth * 9 / 16);
                    if (targetHeight > originalMetadata.height) {
                        targetHeight = originalMetadata.height;
                        targetWidth = Math.round(targetHeight * 16 / 9);
                    }
                }
            } else if (options.cropRatio === '4:3') {
                if (targetWidth) targetHeight = Math.round(targetWidth * 3 / 4);
                else if (targetHeight) targetWidth = Math.round(targetHeight * 4 / 3);
                else {
                    targetWidth = originalMetadata.width;
                    targetHeight = Math.round(targetWidth * 3 / 4);
                    if (targetHeight > originalMetadata.height) {
                        targetHeight = originalMetadata.height;
                        targetWidth = Math.round(targetHeight * 4 / 3);
                    }
                }
            } else if (options.cropRatio === 'custom') {
                // If custom ratio, we just use the user-provided targetWidth/Height
                // and Sharp's resize(targetWidth, targetHeight, {fit: 'cover'}) will handle the crop.
            }
        }

        if (targetWidth || targetHeight) {
            pipeline = pipeline.resize({
                width: targetWidth,
                height: targetHeight,
                fit: resizeFit
            });
        }

        // 2. Rotation & Flip
        if (options.rotation && options.rotation !== 0) {
            pipeline = pipeline.rotate(options.rotation);
        }
        if (options.flipV) pipeline = pipeline.flip();
        if (options.flipH) pipeline = pipeline.flop();

        // 3. Color Adjustments
        // Brightness & Saturation
        if (options.brightness !== 1 || options.saturation !== 1) {
            pipeline = pipeline.modulate({
                brightness: options.brightness || 1,
                saturation: options.saturation || 1
            });
        }
        // Contrast (using linear approximation: contrast * (x - 128) + 128)
        if (options.contrast !== 1) {
            const contrast = options.contrast || 1;
            pipeline = pipeline.linear(contrast, -(128 * contrast) + 128);
        }

        // 4. Border & Radius (Requires knowing final dimensions)
        // We'll apply this at the end using composite
        let overlays = [];

        // Get dimensions after resize/crop/rotate (always needed for watermark)
        const currentMetadata = await pipeline.metadata();
        const w = currentMetadata.width;
        const h = currentMetadata.height;

        if (options.borderRadius > 0 || options.borderWidth > 0) {
            const r = options.borderRadius || 0;
            const bw = options.borderWidth || 0;
            const bc = options.borderColor || '#000000';

            // Create SVG mask for rounded corners
            if (r > 0) {
                const mask = Buffer.from(`
                    <svg width="${w}" height="${h}">
                        <rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="white" />
                    </svg>
                `);
                pipeline = pipeline.composite([{
                    input: mask,
                    blend: 'dest-in'
                }]);
            }

            // Add border overlay
            if (bw > 0) {
                const borderSvg = Buffer.from(`
                    <svg width="${w}" height="${h}">
                        <rect x="${bw / 2}" y="${bw / 2}" width="${w - bw}" height="${h - bw}" rx="${r}" ry="${r}" 
                              fill="none" stroke="${bc}" stroke-width="${bw}" />
                    </svg>
                `);
                overlays.push({ input: borderSvg, blend: 'over' });
            }
        }

        // 5. Watermark (Image & Text)
        // Use the metadata obtained above
        const imageWidth = currentMetadata.width || 1000;
        const imageHeight = currentMetadata.height || 1000;
        const { watermarkPosition = 'center' } = options;

        // 5.1 Image Watermark
        if (options.watermarkPath && fs.existsSync(options.watermarkPath)) {
            try {
                let wmPipeline = sharp(options.watermarkPath);
                const wmMetadata = await wmPipeline.metadata();

                // Resize watermark if it's larger than image (max 40% of image size)
                const maxWmWidth = Math.floor(imageWidth * 0.4);
                const maxWmHeight = Math.floor(imageHeight * 0.4);

                if (wmMetadata.width > imageWidth || wmMetadata.height > imageHeight ||
                    wmMetadata.width > maxWmWidth || wmMetadata.height > maxWmHeight) {
                    wmPipeline = wmPipeline.resize(maxWmWidth, maxWmHeight, {
                        fit: 'inside',
                        withoutEnlargement: true
                    });
                }

                const wmBuffer = await wmPipeline.toBuffer();
                let wmCompOptions = {
                    input: wmBuffer,
                    blend: 'over'
                };

                if (watermarkPosition === 'southeast') {
                    wmCompOptions.gravity = 'southeast';
                } else if (watermarkPosition === 'tile') {
                    wmCompOptions.tile = true;
                } else {
                    wmCompOptions.gravity = 'center';
                }
                overlays.push(wmCompOptions);
            } catch (err) {
                console.error('Error processing image watermark:', err);
            }
        }

        // 5.2 Text Watermark
        if (watermarkText) {
            // SVG Text Watermark - sized based on image dimensions
            const svgWidth = Math.floor(imageWidth);
            const svgHeight = Math.floor(imageHeight);

            // Use custom font size or default to 6% of image dimensions
            const fontSizePercent = options.watermarkFontSize || 6;
            const fontSize = Math.floor(Math.min(imageWidth, imageHeight) * (fontSizePercent / 100));

            // Use custom color or default to white
            const textColor = options.watermarkColor || '#ffffff';

            // Use custom opacity or default to 0.6
            const textOpacity = options.watermarkOpacity !== undefined ? options.watermarkOpacity : 0.6;

            // Escape special SVG characters in watermark text
            const escapedText = watermarkText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');

            const textSvg = `
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <text 
    x="50%" 
    y="50%" 
    text-anchor="middle" 
    dominant-baseline="middle" 
    font-family="Arial, sans-serif" 
    font-size="${fontSize}px" 
    font-weight="bold" 
    fill="${textColor}" 
    fill-opacity="${textOpacity}"
    transform="rotate(-30 ${svgWidth / 2} ${svgHeight / 2})"
  >${escapedText}</text>
</svg>`;

            const watermarkBuffer = await sharp(Buffer.from(textSvg))
                .png()
                .toBuffer();

            let compositeOptions = {
                input: watermarkBuffer,
                blend: 'over'
            };

            if (watermarkPosition === 'southeast') {
                compositeOptions.gravity = 'southeast';
            } else if (watermarkPosition === 'tile') {
                compositeOptions.tile = true;
            } else {
                compositeOptions.gravity = 'center';
            }

            overlays.push(compositeOptions);
        }

        if (overlays.length > 0) {
            pipeline = pipeline.composite(overlays);
        }

        // 6. Format & Output
        // Naming logic A: Custom name + index, OR Original name + timestamp (no index)
        const parsedPath = path.parse(inputPath);

        // Check if user provided custom filename
        const hasCustomName = options.customFilename && options.customFilename.trim() !== '';

        let baseFilename;
        if (hasCustomName) {
            // Custom name: apply SEO optimization if enabled, then add index
            let filename = options.customFilename;
            if (options.seoOptimizedNaming) {
                filename = optimizeFilenameForSEO(filename, true);
            }

            // 智能编号逻辑：只有在批量导出（totalFiles > 1）时才添加数字后缀，防止重名覆盖
            if (options.totalFiles > 1) {
                const index = (options.currentIndex || 1).toString().padStart(3, '0');
                baseFilename = `${filename}_${index}`;
            } else {
                // 单张处理时不添加数字后缀
                baseFilename = filename;
            }
        } else {
            // Original name: apply SEO optimization if enabled, then add timestamp
            let filename = parsedPath.name;
            if (options.seoOptimizedNaming) {
                filename = optimizeFilenameForSEO(filename, true);
            }
            const now = new Date();
            const timestamp = now.getFullYear().toString() +
                (now.getMonth() + 1).toString().padStart(2, '0') +
                now.getDate().toString().padStart(2, '0') +
                now.getHours().toString().padStart(2, '0') +
                now.getMinutes().toString().padStart(2, '0') +
                now.getSeconds().toString().padStart(2, '0') +
                now.getMilliseconds().toString().padStart(3, '0');

            baseFilename = `${filename}_${timestamp}`;
        }

        const outputFilename = `${baseFilename}.${format}`;
        const outputPath = path.join(outputDir, outputFilename);

        // Handle transparency: flatten to white for non-alpha formats
        const nonAlphaFormats = ['jpeg', 'jpg', 'bmp', 'tiff'];
        if (nonAlphaFormats.includes(format.toLowerCase())) {
            pipeline = pipeline.flatten({ background: '#ffffff' });
        }

        // Convert to the specified format and save
        await pipeline
            .toFormat(format, { quality: parseInt(quality) || 80 })
            .toFile(outputPath);

        // 7. Multi-size Export (SEO)
        const sizesToExport = [];

        // Add selected presets
        if (options.selectedSizes && Array.isArray(options.selectedSizes)) {
            options.selectedSizes.forEach(key => {
                if (SIZE_PRESETS[key]) {
                    sizesToExport.push(SIZE_PRESETS[key]);
                }
            });
        }

        // Add custom sizes (if provided)
        if (options.customSizes && Array.isArray(options.customSizes)) {
            sizesToExport.push(...options.customSizes);
        }

        if (sizesToExport.length > 0) {
            try {
                // Use the processed main image as source for resized versions
                const outputExt = path.extname(outputFilename);
                const outputNameWithoutExt = path.basename(outputFilename, outputExt);

                for (const sizeConfig of sizesToExport) {
                    // Construct filename: base_suffix.ext
                    // If no suffix provided, generate one: -WxH
                    const suffix = sizeConfig.suffix || `-${sizeConfig.width}x${sizeConfig.height}`;
                    const sizedFilename = `${outputNameWithoutExt}${suffix}${outputExt}`;
                    const sizedOutputPath = path.join(outputDir, sizedFilename);

                    // Resize and save
                    await sharp(outputPath)
                        .resize({
                            width: parseInt(sizeConfig.width),
                            height: parseInt(sizeConfig.height),
                            fit: sizeConfig.fit || 'inside', // 'inside' maintains aspect ratio
                            withoutEnlargement: true
                        })
                        .toFile(sizedOutputPath);
                }
            } catch (error) {
                console.error('Multi-size export error:', error);
                // Don't fail the main process if aux sizes fail
            }
        }

        return { success: true, path: outputPath };

    } catch (error) {
        console.error('Error processing image:', inputPath, error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    processImage
};
