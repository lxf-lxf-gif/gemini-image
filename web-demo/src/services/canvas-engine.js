/**
 * Web Canvas Rendering Engine
 * Handles image processing in the browser: rotation, flipping, filters, watermarking, and borders.
 */

const MAX_IMAGE_DIMENSION = 4096; // Maximum width or height

export async function processImage(fileRecord, settings) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let { width, height } = img;
                const { rotation, flipH, flipV, brightness, contrast, saturation, watermarkEnabled, watermarkText, watermarkColor, watermarkOpacity, borderRadius, borderWidth, borderColor, outputFormat, quality, cropEnabled, cropRatio } = settings;

                // 1. Image Size Validation & Auto-compression
                if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                    const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
                    width = Math.floor(width * scale);
                    height = Math.floor(height * scale);
                    console.warn(`Image resized from ${img.width}x${img.height} to ${width}x${height} to prevent browser overload.`);
                }

                // 2. Calculate Crop Dimensions (if enabled)
                let cropX = 0, cropY = 0, cropW = width, cropH = height;
                if (cropEnabled && cropRatio !== 'free') {
                    const [ratioW, ratioH] = cropRatio.split(':').map(Number);
                    const targetRatio = ratioW / ratioH;
                    const currentRatio = width / height;

                    if (currentRatio > targetRatio) {
                        // Image is wider, crop width
                        cropW = height * targetRatio;
                        cropX = (width - cropW) / 2;
                    } else {
                        // Image is taller, crop height
                        cropH = width / targetRatio;
                        cropY = (height - cropH) / 2;
                    }
                }

                // 3. Calculate Canvas size based on rotation
                const isRotated90 = Math.abs(rotation % 180) === 90;
                canvas.width = isRotated90 ? cropH : cropW;
                canvas.height = isRotated90 ? cropW : cropH;

                // 4. Clear background
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // 5. Set Filters
                ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;

                // 6. Transform & Draw Image
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

                // Handle Border Radius (Clipping)
                if (borderRadius > 0) {
                    const r = Math.min(borderRadius, cropW / 2, cropH / 2);
                    ctx.beginPath();
                    ctx.moveTo(-cropW / 2 + r, -cropH / 2);
                    ctx.lineTo(cropW / 2 - r, -cropH / 2);
                    ctx.quadraticCurveTo(cropW / 2, -cropH / 2, cropW / 2, -cropH / 2 + r);
                    ctx.lineTo(cropW / 2, cropH / 2 - r);
                    ctx.quadraticCurveTo(cropW / 2, cropH / 2, cropW / 2 - r, cropH / 2);
                    ctx.lineTo(-cropW / 2 + r, cropH / 2);
                    ctx.quadraticCurveTo(-cropW / 2, cropH / 2, -cropW / 2, cropH / 2 - r);
                    ctx.lineTo(-cropW / 2, -cropH / 2 + r);
                    ctx.quadraticCurveTo(-cropW / 2, -cropH / 2, -cropW / 2 + r, -cropH / 2);
                    ctx.closePath();
                    ctx.clip();
                }

                // Draw cropped image
                ctx.drawImage(img, cropX, cropY, cropW, cropH, -cropW / 2, -cropH / 2, cropW, cropH);

                // 7. Apply Border
                if (borderWidth > 0) {
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = borderWidth * 2;
                    ctx.stroke();
                }

                ctx.restore();
                ctx.filter = 'none';

                // 8. Watermark
                if (watermarkEnabled && watermarkText) {
                    const fontSize = Math.max(20, canvas.width / 25);
                    ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
                    ctx.fillStyle = watermarkColor;
                    ctx.globalAlpha = watermarkOpacity;
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';

                    const padding = fontSize;
                    ctx.fillText(watermarkText, canvas.width - padding, canvas.height - padding);
                    ctx.globalAlpha = 1.0;
                }

                // 9. Output to Blob
                const mimeType = `image/${outputFormat === 'jpg' ? 'jpeg' : outputFormat}`;
                canvas.toBlob((blob) => {
                    resolve({
                        blob,
                        previewUrl: URL.createObjectURL(blob),
                        name: fileRecord.newName || `processed-${fileRecord.id}.${outputFormat}`
                    });
                }, mimeType, quality / 100);

            } catch (err) {
                reject(err);
            }
        };
        img.onerror = reject;
        img.src = fileRecord.previewUrl;
    });
}
