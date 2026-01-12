import { useState, useRef, useEffect } from 'react'
import { removeBackground as removeBackgroundAI } from '@imgly/background-removal'
import { Upload, Image as ImageIcon, Play, XCircle, FolderOpen, Check, AlertCircle, ArrowRight, Sparkles, Key } from 'lucide-react'
import MetadataEditor from './components/MetadataEditor'

// 有效图片格式
const VALID_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif']

function App() {
    const [files, setFiles] = useState([]); // Array: { path, id, previewUrl, processStatus: 'pending'|'processing'|'success'|'error', errorMsg }
    const [processing, setProcessing] = useState(false);
    const [completed, setCompleted] = useState(0);
    const [currentProcessingFile, setCurrentProcessingFile] = useState('');
    const [cancelRequested, setCancelRequested] = useState(false);

    // Settings State
    const [resizeWidth, setResizeWidth] = useState('');
    const [resizeHeight, setResizeHeight] = useState('');
    const [watermarkText, setWatermarkText] = useState('');
    const [watermarkPath, setWatermarkPath] = useState('');
    const [watermarkPosition, setWatermarkPosition] = useState('center'); // center, southeast, tile
    const [watermarkColor, setWatermarkColor] = useState('#ffffff'); // 水印文字颜色
    const [watermarkFontSize, setWatermarkFontSize] = useState(6); // 字体大小百分比 (1-15%)
    const [watermarkOpacity, setWatermarkOpacity] = useState(0.6); // 不透明度 (0-1)
    const [watermarkEnabled, setWatermarkEnabled] = useState(true); // 是否启用水印
    const [outputFormat, setOutputFormat] = useState('jpeg'); // jpeg, png, webp
    const [outputDir, setOutputDir] = useState('');
    const [sizePreset, setSizePreset] = useState('blog'); // blog, social
    const [quality, setQuality] = useState(80); // 0-100
    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
    const [flipH, setFlipH] = useState(false); // horizontal flip
    const [flipV, setFlipV] = useState(false); // vertical flip
    const [customFilename, setCustomFilename] = useState(''); // 自定义文件名
    const [seoOptimizedNaming, setSeoOptimizedNaming] = useState(false); // SEO文件名优化
    const [selectedSizes, setSelectedSizes] = useState([]); // 选中的导出尺寸

    // Crop settings
    const [cropEnabled, setCropEnabled] = useState(false);
    const [cropRatio, setCropRatio] = useState('free'); // 1:1, 16:9, 4:3, free

    // Color adjustments
    const [brightness, setBrightness] = useState(1.0); // 0.5-2.0
    const [contrast, setContrast] = useState(1.0); // 0.5-2.0
    const [saturation, setSaturation] = useState(1.0); // 0-2.0

    // Border & Radius
    const [borderRadius, setBorderRadius] = useState(0); // 0-50
    const [borderWidth, setBorderWidth] = useState(0); // 0-20
    const [borderColor, setBorderColor] = useState('#000000');

    // Metadata
    const [metadata, setMetadata] = useState({
        title: '',
        description: '',
        alt: '',
        keywords: [],
        author: '',
        copyright: ''
    });
    const [showMetadata, setShowMetadata] = useState(false);

    // Presets
    const [presets, setPresets] = useState([]);
    const [currentPresetName, setCurrentPresetName] = useState('');

    // AI Integration
    const [apiKey, setApiKey] = useState('');
    const [modelName, setModelName] = useState('gemini-1.5-flash');
    const [aiContext, setAiContext] = useState(''); // User provided context for AI
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // AI Features
    const [isRemoveBackgroundEnabled, setIsRemoveBackgroundEnabled] = useState(false);
    const [previewRemovedBgUrl, setPreviewRemovedBgUrl] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewProgress, setPreviewProgress] = useState(0);
    const [showOriginalInPreview, setShowOriginalInPreview] = useState(false);

    // Text-to-Image Feature
    const [textToImagePrompt, setTextToImagePrompt] = useState('');
    const [hfApiKey, setHfApiKey] = useState(''); // Vector Engine API Key (文字转图片)
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    // DALL-E Configuration
    const [dalleModel, setDalleModel] = useState('dall-e-3');
    const [dalleSize, setDalleSize] = useState('1024x1024');
    const [dalleQuality, setDalleQuality] = useState('standard');
    const [customModelName, setCustomModelName] = useState(''); // 自定义模型名称
    const [apiProvider, setApiProvider] = useState('google'); // 'google' or 'vectorengine'

    // Reference Image Feature
    const [referenceImage, setReferenceImage] = useState(null); // 参考图预览URL
    const [referenceImagePath, setReferenceImagePath] = useState(''); // 参考图文件路径

    // Sidebar UI State
    const [showAdvanced, setShowAdvanced] = useState(false);





    const [previewImage, setPreviewImage] = useState(null);
    const [showWatermarkPreview, setShowWatermarkPreview] = useState(false);

    const [isElectron] = useState(!!window.electronAPI);
    const fileInputRef = useRef(null);

    // 文件过滤函数
    const filterImageFiles = (filePaths) => {
        const validFiles = [];
        const invalidFiles = [];

        filePaths.forEach(filePath => {
            const ext = filePath.split('.').pop().toLowerCase();
            if (VALID_IMAGE_FORMATS.includes(ext)) {
                validFiles.push(filePath);
            } else {
                invalidFiles.push(filePath);
            }
        });

        if (invalidFiles.length > 0) {
            alert(`已过滤 ${invalidFiles.length} 个非图片文件`);
        }

        return validFiles;
    };

    const handleSelectFiles = async () => {
        if (isElectron) {
            // Electron Mode
            const filePaths = await window.electronAPI.selectFiles();
            if (filePaths && filePaths.length > 0) {
                const validPaths = filterImageFiles(filePaths);
                const newFiles = validPaths.map(path => ({
                    path,
                    // Convert windows path to file URL for preview
                    previewUrl: `file:///${path.replace(/\\/g, '/')}`,
                    id: Math.random().toString(36).substr(2, 9),
                    processStatus: 'pending',
                    newName: '',
                    alt: ''
                }));
                setFiles(prev => [...prev, ...newFiles]);
            }
        } else {
            // Browser Mode (Fallback)
            fileInputRef.current?.click();
        }
    };

    const handleSelectWatermark = async () => {
        if (!isElectron) return;
        const filePath = await window.electronAPI.selectWatermark();
        if (filePath) {
            setWatermarkPath(filePath);
        }
    };

    const handleBrowserFileSelect = (e) => {
        if (e.target.files) {
            processBrowserFiles(Array.from(e.target.files));
        }
    };

    const processBrowserFiles = (browserFiles) => {
        const newFiles = browserFiles.map(file => ({
            path: file.name, // In browser, we only have name, not full path
            previewUrl: URL.createObjectURL(file), // Create object URL for preview
            fileObject: file, // Keep reference for potential upload logic later
            id: Math.random().toString(36).substr(2, 9),
            status: 'browser-preview',
            newName: '',
            alt: ''
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    // Cleanup object URLs when files are removed to prevent memory leaks
    useEffect(() => {
        return () => {
            files.forEach(file => {
                if (file.previewUrl && file.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(file.previewUrl);
                }
            });
        };
    }, [files]);

    // Also cleanup on component unmount
    useEffect(() => {
        return () => {
            files.forEach(file => {
                if (file.previewUrl && file.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(file.previewUrl);
                }
            });
        };
    }, []); // Empty dependency array - runs only on unmount

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (isElectron) {
                // In Electron, dropped files have 'path' property
                const droppedPaths = Array.from(e.dataTransfer.files).map(f => f.path);
                const validPaths = filterImageFiles(droppedPaths);
                const newFiles = validPaths.map(path => ({
                    path,
                    previewUrl: `file:///${path.replace(/\\/g, '/')}`,
                    id: Math.random().toString(36).substr(2, 9),
                    processStatus: 'pending',
                    newName: '',
                    alt: ''
                }));
                setFiles(prev => [...prev, ...newFiles]);
            } else {
                // Browser Drop
                processBrowserFiles(Array.from(e.dataTransfer.files));
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleSelectOutputDir = async () => {
        if (!isElectron) {
            alert("浏览器模式下暂不支持文件夹选择。");
            return;
        }
        const path = await window.electronAPI.selectFolder();
        if (path) setOutputDir(path);
    }

    // ===== Phase 1.5: Real-time Filename Preview =====
    useEffect(() => {
        if (!isElectron) return;

        const updateFilenamePreviews = async () => {
            let hasChanges = false;

            // Map files to promises to get optimized names
            const updatedFilesPromises = files.map(async (file, index) => {
                // Get original filename without extension
                const originalName = file.path.split(/[\\/]/).pop().replace(/\.[^/.]+$/, "");

                const optimizedName = await window.electronAPI.optimizeFilename({
                    filename: originalName,
                    customFilename: customFilename,
                    seoEnabled: seoOptimizedNaming
                });

                // Format logic matches image-processor.js
                let finalName;
                if (customFilename) {
                    // 智能预览：多张图片时显示编号，单张不显示
                    if (files.length > 1) {
                        const idx = (index + 1).toString().padStart(3, '0');
                        finalName = `${optimizedName}_${idx}.${outputFormat}`;
                    } else {
                        finalName = `${optimizedName}.${outputFormat}`;
                    }
                } else {
                    // Original name logic: name + timestamp
                    // utilizing a fixed placeholder for timestamp to avoid confusion in preview
                    finalName = `${optimizedName}_<时间戳>.${outputFormat}`;
                }

                if (file.newName !== finalName) {
                    hasChanges = true;
                    return { ...file, newName: finalName };
                }
                return file;
            });

            const updatedFiles = await Promise.all(updatedFilesPromises);

            if (hasChanges) {
                setFiles(updatedFiles);
            }
        };

        const timer = setTimeout(updateFilenamePreviews, 300);
        return () => clearTimeout(timer);
    }, [customFilename, seoOptimizedNaming, outputFormat, files.length]); // Depend on files.length to avoid loops when updating newName

    // ===== Phase 2: 快捷键支持 =====
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl/Cmd + O: 打开文件
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                handleSelectFiles();
            }

            // Ctrl/Cmd + Enter: 开始处理
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (files.length > 0 && !processing) {
                    handleProcessBatch();
                }
            }

            // Escape: 关闭预览
            if (e.key === 'Escape' && previewImage) {
                setPreviewImage(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [files, processing, previewImage]);


    // Load presets on mount
    useEffect(() => {
        const savedPresets = localStorage.getItem('image-marketing-presets');
        if (savedPresets) {
            try {
                setPresets(JSON.parse(savedPresets));
            } catch (e) {
                console.error('Failed to parse presets', e);
            }
        }
    }, []);

    const savePresetsToStorage = (newPresets) => {
        localStorage.setItem('image-marketing-presets', JSON.stringify(newPresets));
        setPresets(newPresets);
    };

    // Load API Key & Model
    useEffect(() => {
        const savedKey = localStorage.getItem('google-gemini-api-key');
        if (savedKey) setApiKey(savedKey);

        const savedHfKey = localStorage.getItem('huggingface-api-key');
        if (savedHfKey) setHfApiKey(savedHfKey);

        const savedModel = localStorage.getItem('google-gemini-model');
        if (savedModel) setModelName(savedModel);

        // Load DALL-E Configuration
        const savedDalleModel = localStorage.getItem('dalle-model');
        if (savedDalleModel) setDalleModel(savedDalleModel);

        const savedDalleSize = localStorage.getItem('dalle-size');
        if (savedDalleSize) setDalleSize(savedDalleSize);

        const savedDalleQuality = localStorage.getItem('dalle-quality');
        if (savedDalleQuality) setDalleQuality(savedDalleQuality);

        const savedCustomModel = localStorage.getItem('custom-model-name');
        if (savedCustomModel) setCustomModelName(savedCustomModel);

        const savedProvider = localStorage.getItem('api-provider');
        if (savedProvider) setApiProvider(savedProvider);
    }, []);

    const saveApiKey = (key, model, hfKey) => {
        if (key !== undefined) {
            setApiKey(key);
            localStorage.setItem('google-gemini-api-key', key);
        }
        if (model !== undefined) {
            setModelName(model);
            localStorage.setItem('google-gemini-model', model);
        }
        if (hfKey !== undefined) {
            setHfApiKey(hfKey);
            localStorage.setItem('huggingface-api-key', hfKey);
        }
        setShowApiKeyModal(false);
    };

    const handleAIGenerate = async () => {
        if (!isElectron) {
            alert('AI 功能仅在桌面版可用');
            return;
        }

        if (!apiKey) {
            setShowApiKeyModal(true);
            return;
        }

        if (files.length === 0) {
            alert('请先添加图片');
            return;
        }

        // Use the first image for generation context
        const fileToAnalyze = files[0];

        setIsGeneratingAI(true);
        try {
            const result = await window.electronAPI.generateMeta({
                imagePath: fileToAnalyze.path,
                apiKey: apiKey,
                modelName: modelName,
                userContext: aiContext
            });

            if (result) {
                if (result.filename) {
                    setCustomFilename(result.filename);
                    // Also enable SEO naming for best results
                    setSeoOptimizedNaming(true);
                }

                if (result.alt) {
                    setMetadata(prev => ({
                        ...prev,
                        description: result.alt,
                        // If title is empty, maybe use filename as title
                        title: prev.title || result.filename.replace(/-/g, ' ')
                    }));
                    setShowMetadata(true);
                }

                alert('✨ AI 生成成功！\n已自动填充文件名和图片描述。');
            }
        } catch (error) {
            console.error('AI Generation Failed:', error);
            alert(`生成失败: ${error.message}\n请检查 API Key 是否正确，或网络是否通畅。`);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // Generate Alt text for metadata
    const handleGenerateAltText = async () => {
        if (!isElectron) {
            alert('AI 功能仅在桌面版可用');
            return;
        }

        if (!apiKey) {
            setShowApiKeyModal(true);
            return;
        }

        if (files.length === 0) {
            alert('请先添加图片');
            return;
        }

        // Use the first image for Alt generation
        const fileToAnalyze = files[0];

        setIsGeneratingAI(true);
        try {
            const altText = await window.electronAPI.generateAltText({
                imagePath: fileToAnalyze.path,
                apiKey: apiKey,
                modelName: modelName,
                userContext: aiContext || metadata.title || metadata.description || ''
            });

            if (altText) {
                setMetadata(prev => ({
                    ...prev,
                    alt: altText
                }));
            }
        } catch (error) {
            console.error('AI Alt Generation Failed:', error);
            alert(`Alt 文本生成失败: ${error.message}\n请检查 API Key 是否正确，或稍后重试。`);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // Batch generate Alt text for all files
    const handleBatchGenerateAlt = async () => {
        if (!isElectron) {
            alert('AI 功能仅在桌面版可用');
            return;
        }

        if (!apiKey) {
            setShowApiKeyModal(true);
            return;
        }

        if (files.length === 0) {
            alert('请先添加图片');
            return;
        }

        const confirmed = confirm(`确定要为 ${files.length} 张图片批量生成 Alt 文本吗？\n这可能需要一些时间。`);
        if (!confirmed) return;

        setIsGeneratingAI(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setCurrentProcessingFile(`正在生成 Alt (${i + 1}/${files.length}): ${file.path.split(/[\\/]/).pop()}`);

                try {
                    const altText = await window.electronAPI.generateAltText({
                        imagePath: file.path,
                        apiKey: apiKey,
                        modelName: modelName,
                        userContext: aiContext || ''
                    });

                    if (altText) {
                        // Update file's alt text
                        setFiles(prev => prev.map(f =>
                            f.id === file.id ? { ...f, alt: altText } : f
                        ));
                        successCount++;
                    }
                } catch (error) {
                    console.error(`Failed to generate alt for ${file.path}:`, error);
                    failCount++;
                }
            }

            alert(`批量生成完成！\n✅ 成功: ${successCount}\n❌ 失败: ${failCount}`);
        } catch (error) {
            console.error('Batch Alt Generation Error:', error);
            alert(`批量生成出错: ${error.message}`);
        } finally {
            setIsGeneratingAI(false);
            setCurrentProcessingFile('');
        }
    };

    const handleSavePreset = () => {
        const name = prompt('请输入快速预设名称 (例如: 博客常用, Instagram竖图):');
        if (!name) return;

        if (presets.find(p => p.name === name)) {
            if (!confirm('已存在同名预设，是否覆盖？')) return;
        }

        const newPreset = {
            name,
            settings: {
                outputFormat,
                resizeWidth,
                resizeHeight,
                sizePreset,
                quality,
                rotation,
                flipH,
                flipV,
                watermarkText,
                watermarkPath,
                watermarkPosition,
                watermarkColor,
                watermarkFontSize,
                watermarkOpacity,
                filenamePrefix,
                cropEnabled,
                cropRatio,
                brightness,
                contrast,
                saturation,
                borderRadius,
                borderWidth,
                borderColor,
                removeBackground: isRemoveBackgroundEnabled
            }
        };

        const updatedPresets = [...presets.filter(p => p.name !== name), newPreset];
        savePresetsToStorage(updatedPresets);
        setCurrentPresetName(name);
    };

    const handleApplyPreset = (presetName) => {
        const preset = presets.find(p => p.name === presetName);
        if (!preset) return;

        const s = preset.settings;
        if (s.outputFormat !== undefined) setOutputFormat(s.outputFormat);
        if (s.resizeWidth !== undefined) setResizeWidth(s.resizeWidth);
        if (s.resizeHeight !== undefined) setResizeHeight(s.resizeHeight);
        if (s.sizePreset !== undefined) setSizePreset(s.sizePreset);
        if (s.quality !== undefined) setQuality(s.quality);
        if (s.rotation !== undefined) setRotation(s.rotation);
        if (s.flipH !== undefined) setFlipH(s.flipH);
        if (s.flipV !== undefined) setFlipV(s.flipV);
        if (s.watermarkText !== undefined) setWatermarkText(s.watermarkText || '');
        if (s.watermarkPath !== undefined) setWatermarkPath(s.watermarkPath || '');
        if (s.watermarkPosition !== undefined) setWatermarkPosition(s.watermarkPosition || 'center');
        if (s.watermarkColor !== undefined) setWatermarkColor(s.watermarkColor || '#ffffff');
        if (s.watermarkFontSize !== undefined) setWatermarkFontSize(s.watermarkFontSize || 6);
        if (s.watermarkOpacity !== undefined) setWatermarkOpacity(s.watermarkOpacity || 0.6);
        if (s.filenamePrefix !== undefined) setFilenamePrefix(s.filenamePrefix || '');
        if (s.cropEnabled !== undefined) setCropEnabled(s.cropEnabled);
        if (s.cropRatio !== undefined) setCropRatio(s.cropRatio);
        if (s.brightness !== undefined) setBrightness(s.brightness);
        if (s.contrast !== undefined) setContrast(s.contrast);
        if (s.saturation !== undefined) setSaturation(s.saturation);
        if (s.borderRadius !== undefined) setBorderRadius(s.borderRadius);
        if (s.borderWidth !== undefined) setBorderWidth(s.borderWidth);
        if (s.borderColor !== undefined) setBorderColor(s.borderColor);
        if (s.removeBackground !== undefined) setIsRemoveBackgroundEnabled(s.removeBackground);

        setCurrentPresetName(presetName);
    };

    const handleDeletePreset = (e, presetName) => {
        e.stopPropagation();
        if (!confirm(`确定要删除预设 "${presetName}" 吗？`)) return;
        const updatedPresets = presets.filter(p => p.name !== presetName);
        savePresetsToStorage(updatedPresets);
        if (currentPresetName === presetName) setCurrentPresetName('');
    };

    const handleProcessBatch = async () => {
        if (!isElectron) {
            alert('预览模式：浏览器中不支持原生文件处理 (Sharp)。请使用 Electron 桌面版进行处理。');
            return;
        }

        if (files.length === 0) {
            alert('请先添加图片文件。');
            return;
        }

        // ===== Phase 1: 输入验证 =====
        // 验证水印路径
        if (watermarkPath) {
            const validation = await window.electronAPI.validatePath({
                filePath: watermarkPath,
                type: 'file'
            });
            if (!validation.valid) {
                alert(`水印图片验证失败: ${validation.error}\n请重新选择水印图片。`);
                return;
            }
        }

        // 验证输出目录
        if (outputDir) {
            const validation = await window.electronAPI.validatePath({
                filePath: outputDir,
                type: 'directory'
            });
            if (!validation.valid) {
                alert(`输出目录验证失败: ${validation.error}\n请重新选择输出目录。`);
                return;
            }
        }

        // 重置所有文件状态
        setFiles(prev => prev.map(f => ({ ...f, processStatus: 'pending', errorMsg: null })));
        setProcessing(true);
        setCompleted(0);
        setCancelRequested(false);
        setCurrentProcessingFile('');

        const options = {
            resizeWidth: resizeWidth || null,
            resizeHeight: resizeHeight || null,
            // 只在启用水印时才传递水印参数
            watermarkText: watermarkEnabled ? (watermarkText || null) : null,
            watermarkPath: watermarkEnabled ? (watermarkPath || null) : null,
            watermarkPosition: watermarkPosition || 'center',
            watermarkColor: watermarkColor || '#ffffff',
            watermarkFontSize: watermarkFontSize || 6,
            watermarkOpacity: watermarkOpacity || 0.6,
            format: outputFormat,
            quality: quality,
            rotation: rotation,
            flipH: flipH,
            flipV: flipV,
            customFilename: customFilename || null,
            seoOptimizedNaming: seoOptimizedNaming,
            selectedSizes: selectedSizes,
            // Crop
            cropEnabled: cropEnabled,
            cropRatio: cropRatio,
            // Color adjustments
            brightness: brightness,
            contrast: contrast,
            saturation: saturation,
            // Border & Radius
            borderRadius: borderRadius,
            borderWidth: borderWidth,
            borderColor: borderColor,
            removeBackground: isRemoveBackgroundEnabled
        };

        let successCount = 0;
        let errorCount = 0;
        const results = [];

        // ===== Phase 2: 处理文件 =====
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // 检查是否请求取消
            if (cancelRequested) {
                alert(`处理已取消。\n成功: ${successCount} 张\n失败: ${errorCount} 张\n未处理: ${files.length - successCount - errorCount} 张`);
                setProcessing(false);
                setCurrentProcessingFile('');
                return;
            }

            const fileName = file.path.split(/[\\/]/).pop();
            setCurrentProcessingFile(fileName);

            // 更新当前文件状态为processing
            setFiles(prev => prev.map(f =>
                f.id === file.id ? { ...f, processStatus: 'processing' } : f
            ));

            try {
                const result = await window.electronAPI.processImage({
                    inputPath: file.path,
                    outputDir: outputDir,
                    options: {
                        ...options,
                        currentIndex: i + 1,  // 传递当前序号(从1开始)
                        totalFiles: files.length // 传递总文件数，用于判断是否需要添加数字后缀
                    },
                    metadata: metadata
                });

                if (result.success) {
                    successCount++;
                    results.push({
                        fileName: fileName,
                        status: 'success',
                        outputPath: result.path
                    });

                    // 更新状态为success
                    setFiles(prev => prev.map(f =>
                        f.id === file.id ? { ...f, processStatus: 'success' } : f
                    ));
                } else {
                    errorCount++;
                    results.push({
                        fileName: fileName,
                        status: 'error',
                        error: result.error || '未知错误'
                    });

                    // 更新状态为error
                    setFiles(prev => prev.map(f =>
                        f.id === file.id
                            ? { ...f, processStatus: 'error', errorMsg: result.error || '处理失败' }
                            : f
                    ));
                }
            } catch (error) {
                errorCount++;
                console.error('处理错误:', error);
                results.push({
                    fileName: fileName,
                    status: 'error',
                    error: error.message
                });

                setFiles(prev => prev.map(f =>
                    f.id === file.id
                        ? { ...f, processStatus: 'error', errorMsg: error.message }
                        : f
                ));
            }

            setCompleted(prev => prev + 1);
        }

        setProcessing(false);
        setCurrentProcessingFile('');

        // ===== Phase 3: 显示结果 =====
        const errorFiles = results.filter(r => r.status === 'error');
        if (errorCount > 0) {
            const errorList = errorFiles.map(f => `• ${f.fileName}: ${f.error}`).join('\n');
            alert(`批量处理完成！\n\n✅ 成功: ${successCount} 张\n❌ 失败: ${errorCount} 张\n\n失败文件:\n${errorList}\n\n已保存到: ${outputDir || '原目录/processed'}`);
        } else {
            alert(`🎉 批量处理完成！\n\n成功处理 ${successCount} 张图片。\n\n已保存到: ${outputDir || '原目录/processed'}`);
        }
    };

    // 取消处理
    const handleCancelProcess = () => {
        if (confirm('确定要取消处理吗？')) {
            setCancelRequested(true);
        }
    };

    // AI 抠图预览处理
    const handlePreviewBgRemoval = async (imageUrl) => {
        if (isPreviewLoading) return;
        setIsPreviewLoading(true);
        try {
            // 修复潜在路径协议问题：
            // 先尝试 fetch 获取 Blob，确保各种 URL 格式（file:///, blob:）都能被库正确处理
            const response = await fetch(imageUrl);
            const inputBlob = await response.blob();

            // 为浏览器端预览调用 - 正确调用导入的函数
            const blob = await removeBackgroundAI(inputBlob, {
                progress: (key, current, total) => {
                    const percent = Math.round((current / total) * 100);
                    setPreviewProgress(percent);
                    console.log(`AI 分析中: ${percent}%`);
                }
            });
            const url = URL.createObjectURL(blob);
            setPreviewRemovedBgUrl(url);
        } catch (error) {
            console.error('AI Preview Failed:', error);
            alert('预览生成失败，请稍后重试。');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    // Text-to-Image Generation Handler
    const handleGenerateImageFromText = async () => {
        if (!isElectron) {
            alert('文字转图片功能仅在桌面版可用');
            return;
        }

        if (!hfApiKey) {
            alert('请先配置 Vector Engine API Key');
            return;
        }

        if (!textToImagePrompt || textToImagePrompt.trim() === '') {
            alert('请输入图片描述文字');
            return;
        }
        setIsGeneratingImage(true);
        try {
            // 使用自定义模型名称(如果有),否则使用预设模型
            const modelToUse = customModelName.trim() || dalleModel;

            const result = await window.electronAPI.generateImageFromText({
                textPrompt: textToImagePrompt,
                apiKey: hfApiKey,
                model: modelToUse,
                provider: apiProvider,
                referenceImagePath: referenceImagePath || null // 传递参考图路径
            });

            if (result.success && result.imagePath) {
                // Add generated image to files list
                const newFile = {
                    path: result.imagePath,
                    previewUrl: `file:///${result.imagePath.replace(/\\/g, '/')}`,
                    id: Math.random().toString(36).substr(2, 9),
                    processStatus: 'pending',
                    newName: '',
                    alt: ''
                };
                setFiles(prev => [...prev, newFile]);
                alert('✨ 图片生成成功！已添加到处理队列。');
                setTextToImagePrompt(''); // Clear input
                // Optionally clear reference image after generation
                // handleClearReferenceImage();
            } else {
                alert(`生成失败: ${result.error}`);
            }
        } catch (error) {
            console.error('Text-to-Image Generation Failed:', error);
            alert(`生成失败: ${error.message}`);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    // Handle reference image selection
    const handleSelectReferenceImage = async () => {
        if (!isElectron) {
            alert('参考图功能仅在桌面版可用');
            return;
        }
        const filePath = await window.electronAPI.selectReferenceImage();
        if (filePath) {
            setReferenceImagePath(filePath);
            setReferenceImage(`file:///${filePath.replace(/\\/g, '/')}`);
        }
    };

    // Clear reference image
    const handleClearReferenceImage = () => {
        setReferenceImage(null);
        setReferenceImagePath('');
    };

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-300 font-sans overflow-hidden selection:bg-primary-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/10 blur-[120px] rounded-full animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse-slow"></div>
            </div>

            {/* LEFT SIDEBAR - ASSETS & GLOBALS */}
            <aside className="w-80 flex flex-col glass-effect border-r border-white/5 z-20">
                <div className="h-16 flex items-center px-6 border-b border-white/5 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <Sparkles className="w-5 h-5 text-white animate-pulse" />
                        </div>
                        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            AI 创作大师
                        </span>
                    </div>
                    {files.length > 0 && (
                        <button
                            onClick={() => setFiles([])}
                            className="text-sm text-slate-500 hover:text-red-400 transition-colors px-2 py-1 hover:bg-white/5 rounded"
                        >
                            清空
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                    {/* Upload / Library */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                            <FolderOpen className="w-3.5 h-3.5" />
                            1. 素材库
                        </h3>
                        <div
                            onClick={handleSelectFiles}
                            className="glass-card rounded-2xl p-6 border-dashed border-white/10 hover:border-primary-500/50 hover:bg-white/5 transition-all cursor-pointer group text-center"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform text-primary-400">
                                <Upload className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold text-slate-400 group-hover:text-white transition-colors">导入本地图片</span>
                            <p className="text-[10px] text-slate-600 mt-2">支持拖拽或文件夹批量导入</p>
                        </div>
                    </div>

                    {/* Watermark Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-500 uppercase tracking-widest">
                                2. 品牌设置
                            </h3>
                            {/* 水印启用开关 */}
                            <button
                                onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                                className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-all ${watermarkEnabled
                                    ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                                    : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                {watermarkEnabled ? (
                                    <>
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        水印已启用
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        水印已禁用
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 水印设置内容 - 只在启用时显示 */}
                        {watermarkEnabled ? (
                            <div className="space-y-3">
                                {/* 清除设置按钮 */}
                                {(watermarkText || watermarkPath) && (
                                    <button
                                        onClick={() => {
                                            if (confirm('确定要清除所有水印设置吗?')) {
                                                setWatermarkText('');
                                                setWatermarkPath('');
                                                setWatermarkColor('#ffffff');
                                                setWatermarkFontSize(6);
                                                setWatermarkOpacity(0.6);
                                                setWatermarkPosition('center');
                                                setShowWatermarkPreview(false);
                                            }
                                        }}
                                        className="w-full py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded text-red-400 text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        清除水印设置
                                    </button>
                                )}

                                {/* Image Watermark */}
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">图片水印</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-slate-400 truncate">
                                            {watermarkPath ? watermarkPath.split(/[\\/]/).pop() : '未选择图片'}
                                        </div>
                                        <button
                                            onClick={handleSelectWatermark}
                                            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-slate-300 hover:text-white hover:bg-white/10 text-sm transition-colors"
                                        >
                                            选择
                                        </button>
                                        {watermarkPath && (
                                            <button
                                                onClick={() => setWatermarkPath('')}
                                                className="text-red-400/50 hover:text-red-400 p-1"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Text Watermark */}
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">水印文字 (可选)</label>
                                    <input
                                        type="text"
                                        value={watermarkText}
                                        onChange={(e) => setWatermarkText(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-base text-white focus:border-lime-500 outline-none transition-colors"
                                        placeholder="例如:@我的店铺"
                                    />
                                </div>

                                {/* Watermark Text Settings - 只在有水印文字时显示 */}
                                {watermarkText && (
                                    <div className="space-y-3 pl-1 border-l-2 border-lime-500/20">
                                        {/* Color Picker */}
                                        <div className="space-y-1">
                                            <label className="text-sm text-slate-400">文字颜色</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={watermarkColor}
                                                    onChange={(e) => setWatermarkColor(e.target.value)}
                                                    className="w-12 h-8 rounded cursor-pointer border border-white/10"
                                                />
                                                <input
                                                    type="text"
                                                    value={watermarkColor}
                                                    onChange={(e) => setWatermarkColor(e.target.value)}
                                                    className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white uppercase"
                                                    placeholder="#ffffff"
                                                />
                                            </div>
                                            {/* 常用颜色快捷选择 */}
                                            <div className="flex gap-1">
                                                {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00'].map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setWatermarkColor(color)}
                                                        className={`w-6 h-6 rounded border-2 transition-all ${watermarkColor === color ? 'border-lime-500 scale-110' : 'border-white/20 hover:border-white/40'}`}
                                                        style={{ backgroundColor: color }}
                                                        title={color}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Font Size Slider */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-slate-400">字体大小</label>
                                                <span className="text-sm text-lime-400 font-bold">{watermarkFontSize}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="15"
                                                step="0.5"
                                                value={watermarkFontSize}
                                                onChange={(e) => setWatermarkFontSize(parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime-500 [&::-webkit-slider-thumb]:cursor-pointer"
                                            />
                                            <div className="flex justify-between text-[9px] text-slate-600">
                                                <span>小</span>
                                                <span>大</span>
                                            </div>
                                        </div>

                                        {/* Opacity Slider */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-slate-400">不透明度</label>
                                                <span className="text-sm text-lime-400 font-bold">{Math.round(watermarkOpacity * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={watermarkOpacity}
                                                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime-500 [&::-webkit-slider-thumb]:cursor-pointer"
                                            />
                                            <div className="flex justify-between text-[9px] text-slate-600">
                                                <span>透明</span>
                                                <span>不透明</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">放置位置</label>
                                    <div className="flex gap-1 p-1 bg-black/20 rounded border border-white/5">
                                        {['center', 'southeast', 'tile'].map((pos) => (
                                            <button
                                                key={pos}
                                                onClick={() => setWatermarkPosition(pos)}
                                                className={`flex-1 py-1 text-sm uppercase rounded transition-colors ${watermarkPosition === pos
                                                    ? 'bg-lime-500/20 text-lime-400 font-bold'
                                                    : 'text-slate-500 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                {pos === 'center' && '居中'}
                                                {pos === 'southeast' && '右下'}
                                                {pos === 'tile' && '平铺'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 预览按钮 - 只在有水印文字时显示 */}
                                {watermarkText && (
                                    <button
                                        onClick={() => setShowWatermarkPreview(!showWatermarkPreview)}
                                        className="w-full py-2 bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/30 hover:border-lime-500/50 rounded text-lime-400 text-base font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        {showWatermarkPreview ? '关闭预览' : '预览效果'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-slate-600 text-sm">
                                水印功能已禁用,图片将不会添加水印
                            </div>
                        )}
                    </div>

                    {/* Image Adjustments Section */}
                    <div className="space-y-3">
                        <h3 className="text-base font-bold text-slate-500 uppercase tracking-widest">
                            3. 图片调整
                        </h3>

                        {/* AI Background Removal */}
                        <div className="p-3 rounded-xl bg-gradient-to-br from-lime-500/10 to-transparent border border-lime-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 px-1.5 bg-lime-500 rounded text-[9px] text-black font-bold uppercase">AI</div>
                                    <label className="text-sm text-slate-200 font-bold">一键抠图 (背景移除)</label>
                                </div>
                                <button
                                    onClick={() => setIsRemoveBackgroundEnabled(!isRemoveBackgroundEnabled)}
                                    className={`w-8 h-4 rounded-full transition-colors relative ${isRemoveBackgroundEnabled ? 'bg-lime-500' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isRemoveBackgroundEnabled ? 'left-4.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-500 leading-tight">
                                {isRemoveBackgroundEnabled
                                    ? "✨ 已开启。批量处理时将自动提取主体。首次运行需下载 AI 模型(约80MB)，请耐心等待。"
                                    : "开启后利用本地 AI 自动识别并移除背景，生成透明素材图。"}
                            </p>
                        </div>
                    </div>

                </div>
            </aside>

            {/* CENTER - CANVAS */}
            <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
                {/* Canvas Header */}
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-slate-950/20 backdrop-blur-xl z-30">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white tracking-wide">设计画板</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{files.length} 个创作项目</span>
                        </div>
                        <div className="h-6 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${processing ? 'bg-primary-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                系统状态: {processing ? '渲染中' : '就绪'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Canvas Area */}
                <div
                    className="flex-1 overflow-y-auto p-10 relative custom-scrollbar"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleBrowserFileSelect}
                        className="hidden"
                    />

                    {files.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <div
                                onClick={handleSelectFiles}
                                className="text-center cursor-pointer group animate-float"
                            >
                                <div className="w-24 h-24 rounded-[2rem] bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center mx-auto mb-6 group-hover:border-primary-500/50 group-hover:bg-primary-500/5 transition-all shadow-2xl">
                                    <Upload className="w-10 h-10 text-slate-600 group-hover:text-primary-400 transition-colors" />
                                </div>
                                <h3 className="text-white text-xl font-bold tracking-tight">开启您的创作之旅</h3>
                                <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">拖入图片或点击上传，AI 将为您自动优化营销素材</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    className="group relative glass-card rounded-2xl overflow-hidden shadow-2xl hover:border-primary-500/50 transition-all hover:-translate-y-2 duration-300"
                                >
                                    <div
                                        className="aspect-[4/3] w-full bg-slate-900/50 relative cursor-zoom-in"
                                        onClick={() => setPreviewImage(file.previewUrl)}
                                    >
                                        {file.previewUrl ? (
                                            <img src={file.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <ImageIcon className="w-8 h-8 opacity-20" />
                                            </div>
                                        )}

                                        {/* ===== Phase 2: 状态指示器 ===== */}
                                        {/* Processing状态 */}
                                        {file.processStatus === 'processing' && (
                                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center z-10 backdrop-blur-sm">
                                                <div className="animate-spin w-8 h-8 border-3 border-white border-t-transparent rounded-full"></div>
                                            </div>
                                        )}

                                        {/* Success状态 */}
                                        {file.processStatus === 'success' && (
                                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg z-10">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}

                                        {/* Error状态 */}
                                        {file.processStatus === 'error' && (
                                            <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center z-10 backdrop-blur-sm p-2">
                                                <AlertCircle className="w-6 h-6 text-red-400 mb-1" />
                                                <div className="text-red-300 text-sm text-center px-2 max-w-full overflow-hidden">
                                                    {file.errorMsg || '处理失败'}
                                                </div>
                                            </div>
                                        )}

                                        {/* Remove Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFiles(files.filter(f => f.id !== file.id));
                                            }}
                                            className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100 z-20"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>

                                        {/* AI Preview Button - 只在开启抠图时显示 */}
                                        {isRemoveBackgroundEnabled && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewImage(file.previewUrl);
                                                    // 自动触发预览
                                                    setTimeout(() => {
                                                        handlePreviewBgRemoval(file.previewUrl);
                                                    }, 100);
                                                }}
                                                className="absolute bottom-2 right-2 px-3 py-1.5 bg-primary-500 hover:bg-primary-400 text-white text-base font-bold rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-105 z-20 flex items-center gap-1 shadow-lg"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                预览抠图
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <div className="text-base font-medium text-slate-300 truncate mb-1" title={file.path.split(/[\\/]/).pop()}>{file.path.split(/[\\/]/).pop()}</div>
                                        {/* Filename Preview */}
                                        <div className="text-sm text-primary-400/80 truncate flex items-center gap-1" title={`预览: ${file.newName}`}>
                                            <ArrowRight className="w-3 h-3 flex-shrink-0" />
                                            {file.newName || '...'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* Add More Button in Grid */}
                            <div
                                onClick={handleSelectFiles}
                                className="aspect-[4/3] rounded-xl border-2 border-dashed border-white/5 hover:border-primary-500/30 hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                            >
                                <Upload className="w-6 h-6 text-slate-700 group-hover:text-primary-400 mb-2 transition-colors" />
                                <span className="text-base text-slate-600 group-hover:text-slate-400">添加图片</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Text-to-Image Generation Section */}
                <div className="border-t border-white/5 bg-slate-950/20 backdrop-blur-xl px-8 py-6 z-20">
                    <div className="w-full max-w-6xl mx-auto">
                        <div className="glass-card rounded-3xl p-6 relative overflow-hidden group">
                            {/* Decorative Background Element */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl -z-10 rounded-full"></div>

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
                                        <Sparkles className="w-4 h-4 text-primary-400 animate-pulse" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white tracking-wide italic">AI 文字转图片</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">由 Vector Engine / SDXL 提供支持</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setShowApiKeyModal(true)}
                                        className="text-[10px] font-bold text-slate-500 hover:text-primary-400 tracking-widest transition-colors uppercase"
                                    >
                                        {hfApiKey ? '修改 API 密钥' : '配置 API'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Upload Box */}
                                <div className="relative group/upload">
                                    {referenceImage ? (
                                        <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-primary-500/30 group-hover:border-primary-500 transition-all shadow-xl">
                                            <img
                                                src={referenceImage}
                                                alt="Reference"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover/upload:scale-110"
                                            />
                                            <button
                                                onClick={handleClearReferenceImage}
                                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                                            >
                                                <XCircle className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label
                                            onClick={handleSelectReferenceImage}
                                            className="w-32 h-32 border-2 border-dashed border-white/5 hover:border-primary-500/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary-500/5 group text-slate-600 hover:text-primary-400"
                                        >
                                            <Upload className="w-5 h-5 mb-2 transition-transform group-hover/upload:-translate-y-1" />
                                            <span className="text-[10px] font-bold uppercase tracking-tighter">参考风格图</span>
                                        </label>
                                    )}
                                </div>

                                <div className="flex-1 relative">
                                    <textarea
                                        value={textToImagePrompt}
                                        onChange={(e) => setTextToImagePrompt(e.target.value)}
                                        placeholder={referenceImage
                                            ? "AI 将参考左侧图片风格，请描述你想生成的内容..."
                                            : "描述您想生成的画面细节，例如：'一个赛博朋克风格的未来城市，霓虹灯光映照在雨后的街道'..."}
                                        className="w-full h-32 bg-slate-900/50 border border-white/5 rounded-2xl p-4 text-slate-300 text-sm focus:ring-1 focus:ring-primary-500/50 outline-none transition-all placeholder:text-slate-700 custom-scrollbar"
                                    />
                                    <button
                                        onClick={handleGenerateImageFromText}
                                        disabled={isGeneratingImage || !hfApiKey}
                                        className={`absolute bottom-4 right-4 py-3 px-8 rounded-xl font-bold transition-all flex items-center gap-2 shadow-2xl ${isGeneratingImage || !hfApiKey
                                            ? 'bg-slate-800 text-slate-500'
                                            : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:scale-105 hover:shadow-primary-500/30'
                                            }`}
                                    >
                                        {isGeneratingImage ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span className="text-sm">正在构思...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                <span className="text-sm">生成并添加到队列</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {!hfApiKey && (
                                <p className="text-[10px] text-red-400/50 text-center mt-3 tracking-widest font-bold opacity-60">
                                    ⓘ 请先在设置中配置 VECTOR ENGINE 密钥
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Status Bar */}
                <div className="h-10 border-t border-white/10 bg-[#0c0c0e] flex items-center px-4 justify-between">
                    {processing ? (
                        <>
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-sm text-primary-400 animate-pulse">处理中</span>
                                <div className="h-3 w-px bg-white/10"></div>
                                <span className="text-sm text-slate-400 truncate max-w-md">
                                    {currentProcessingFile || '准备中...'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-400">
                                    {completed}/{files.length}
                                </span>
                                <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-500 transition-all duration-300"
                                        style={{
                                            width: files.length > 0 ? `${(completed / files.length) * 100}%` : '0%'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleCancelProcess}
                                    className="text-sm text-red-400 hover:text-red-300 px-2 py-1 hover:bg-red-500/10 rounded transition-colors"
                                >
                                    取消
                                </button>
                            </div>
                        </>
                    ) : (
                        <span className="text-sm text-slate-600 uppercase tracking-wider font-medium">就绪</span>
                    )}
                </div>
            </main>

            {/* RIGHT SIDEBAR - CONTROLS */}
            <aside className="w-80 flex flex-col border-l border-white/10 bg-[#0c0c0e]">
                <div className="h-14 flex items-center px-4 border-b border-white/10">
                    <span className="font-medium text-white">控制台</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-8">
                    {/* Export Section */}
                    <div className="space-y-4">
                        <h3 className="text-base font-bold text-slate-500 uppercase tracking-widest">
                            导出配置
                        </h3>

                        {/* Output Dir */}
                        <div className="space-y-1">
                            <label className="text-sm text-slate-400">输出位置</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={outputDir}
                                    onChange={(e) => setOutputDir(e.target.value)}
                                    disabled={processing}
                                    className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-base text-slate-400 truncate hover:text-white focus:text-white focus:border-primary-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="默认：原目录/processed"
                                />
                                <button
                                    onClick={handleSelectOutputDir}
                                    disabled={processing}
                                    className="p-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <FolderOpen className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Resize */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-slate-400">尺寸设置</label>
                                <div className="flex gap-1 p-0.5 bg-black/20 rounded border border-white/5">
                                    <button
                                        onClick={() => setSizePreset('blog')}
                                        className={`px-2 py-0.5 text-[9px] rounded transition-colors ${sizePreset === 'blog' ? 'bg-primary-500/20 text-primary-400' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        博客
                                    </button>
                                    <button
                                        onClick={() => setSizePreset('social')}
                                        className={`px-2 py-0.5 text-[9px] rounded transition-colors ${sizePreset === 'social' ? 'bg-primary-500/20 text-primary-400' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        社交媒体
                                    </button>
                                </div>
                            </div>

                            {sizePreset === 'blog' ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { setResizeWidth('800'); setResizeHeight('600'); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${resizeWidth === '800' && resizeHeight === '600' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        800×600 横图
                                    </button>
                                    <button
                                        onClick={() => { setResizeWidth('600'); setResizeHeight('400'); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${resizeWidth === '600' && resizeHeight === '400' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        600×400 小图
                                    </button>
                                    <button
                                        onClick={() => { setResizeWidth('800'); setResizeHeight('800'); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${resizeWidth === '800' && resizeHeight === '800' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        800×800 方形
                                    </button>
                                    <button
                                        onClick={() => { setResizeWidth('1200'); setResizeHeight('800'); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${resizeWidth === '1200' && resizeHeight === '800' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        1200×800 大图
                                    </button>
                                    <button
                                        onClick={() => { setResizeWidth('600'); setResizeHeight('800'); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${resizeWidth === '600' && resizeHeight === '800' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        600×800 竖图
                                    </button>
                                    <button
                                        onClick={() => { setResizeWidth(''); setResizeHeight(''); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${!resizeWidth && !resizeHeight ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        原始尺寸
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { setResizeWidth('1080'); setResizeHeight('1080'); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${resizeWidth === '1080' && resizeHeight === '1080' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        Instagram 方图
                                    </button>
                                    <button
                                        onClick={() => { setResizeWidth('1080'); setResizeHeight('1350'); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${resizeWidth === '1080' && resizeHeight === '1350' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        Instagram 竖图
                                    </button>
                                    <button
                                        onClick={() => { setResizeWidth('1080'); setResizeHeight('1920'); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${resizeWidth === '1080' && resizeHeight === '1920' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        Instagram Story
                                    </button>
                                    <button
                                        onClick={() => { setResizeWidth('1200'); setResizeHeight('630'); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${resizeWidth === '1200' && resizeHeight === '630' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        Facebook 链接
                                    </button>
                                    <button
                                        onClick={() => { setResizeWidth('1200'); setResizeHeight('1200'); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${resizeWidth === '1200' && resizeHeight === '1200' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        微信朋友圈
                                    </button>
                                    <button
                                        onClick={() => { setResizeWidth(''); setResizeHeight(''); }}
                                        className={`py-1.5 text-sm rounded border transition-colors ${!resizeWidth && !resizeHeight ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        原始尺寸
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={resizeWidth}
                                        onChange={(e) => setResizeWidth(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-base text-white focus:border-primary-500 outline-none pl-8"
                                        placeholder="自动"
                                    />
                                    <span className="absolute left-2.5 top-2 text-sm text-slate-600 font-bold">W</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={resizeHeight}
                                        onChange={(e) => setResizeHeight(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-base text-white focus:border-primary-500 outline-none pl-8"
                                        placeholder="自动"
                                    />
                                    <span className="absolute left-2.5 top-2 text-sm text-slate-600 font-bold">H</span>
                                </div>
                            </div>
                        </div>

                        {/* Format */}
                        <div className="space-y-1">
                            <label className="text-sm text-slate-400">输出格式</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setOutputFormat('jpeg')}
                                    className={`py-1.5 text-sm rounded border transition-colors ${outputFormat === 'jpeg' ? 'bg-primary-500/10 border-primary-500 text-primary-400 font-bold' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                >
                                    JPEG
                                </button>
                                <button
                                    onClick={() => setOutputFormat('png')}
                                    className={`py-1.5 text-sm rounded border transition-colors ${outputFormat === 'png' ? 'bg-primary-500/10 border-primary-500 text-primary-400 font-bold' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                >
                                    PNG
                                </button>
                                <button
                                    onClick={() => setOutputFormat('webp')}
                                    className={`py-1.5 text-sm rounded border transition-colors ${outputFormat === 'webp' ? 'bg-primary-500/10 border-primary-500 text-primary-400 font-bold' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                >
                                    WebP
                                </button>
                                <button
                                    onClick={() => setOutputFormat('avif')}
                                    className={`py-1.5 text-sm rounded border transition-colors ${outputFormat === 'avif' ? 'bg-primary-500/10 border-primary-500 text-primary-400 font-bold' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                >
                                    AVIF
                                </button>
                                <button
                                    onClick={() => setOutputFormat('tiff')}
                                    className={`py-1.5 text-sm rounded border transition-colors ${outputFormat === 'tiff' ? 'bg-primary-500/10 border-primary-500 text-primary-400 font-bold' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                >
                                    TIFF
                                </button>
                                <button
                                    onClick={() => setOutputFormat('gif')}
                                    className={`py-1.5 text-sm rounded border transition-colors ${outputFormat === 'gif' ? 'bg-primary-500/10 border-primary-500 text-primary-400 font-bold' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                >
                                    GIF
                                </button>
                            </div>
                        </div>






                        {/* Rotation moved to Advanced section */}
                        {/* Multi-size Export */}

                        {/* Multi-size Export */}
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">SEO 多尺寸导出</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'thumbnail', label: '缩略图 (200x200)' },
                                    { id: 'small', label: '小图 (400x400)' },
                                    { id: 'medium', label: '中图 (800x800)' },
                                    { id: 'large', label: '大图 (1200x1200)' },
                                    { id: 'og', label: 'OG分享图 (1200x630)' }
                                ].map((size) => (
                                    <button
                                        key={size.id}
                                        onClick={() => {
                                            if (selectedSizes.includes(size.id)) {
                                                setSelectedSizes(selectedSizes.filter(s => s !== size.id));
                                            } else {
                                                setSelectedSizes([...selectedSizes, size.id]);
                                            }
                                        }}
                                        className={`px-2 py-1.5 text-sm rounded border transition-all text-left ${selectedSizes.includes(size.id)
                                            ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                            }`}
                                    >
                                        {size.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* File Naming */}
                        <div className="space-y-2">
                            {/* AI Context Input */}
                            <div className="space-y-1">
                                <label className="text-[9px] text-slate-500">AI 提示词/关键信息 (可选)</label>
                                <input
                                    type="text"
                                    value={aiContext}
                                    onChange={(e) => setAiContext(e.target.value)}
                                    placeholder="例如: Nike 跑鞋 红色 夏季新款"
                                    className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-sm text-slate-300 placeholder:text-slate-600 focus:border-purple-500/50 outline-none transition-colors"
                                />
                            </div>

                            <div className="flex justify-between items-center pt-1">
                                <label className="text-sm text-slate-400">文件命名</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowApiKeyModal(true)}
                                        className="text-[9px] text-slate-500 hover:text-purple-400 underline decoration-dashed underline-offset-2 transition-colors"
                                        title="修改 API Key"
                                    >
                                        {apiKey ? '修改 Key' : '设置 Key'}
                                    </button>
                                    <button
                                        onClick={handleAIGenerate}
                                        disabled={isGeneratingAI || processing}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] border transition-all ${isGeneratingAI
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-300 animate-pulse'
                                            : 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 text-purple-300 hover:border-purple-500/60 hover:text-white'
                                            }`}
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        {isGeneratingAI ? 'AI 思考中...' : 'AI 智能生成'}
                                    </button>
                                </div>
                            </div>

                            <input
                                type="text"
                                value={customFilename}
                                onChange={(e) => setCustomFilename(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-base text-white focus:border-primary-500 outline-none"
                                placeholder="输入文件名(留空则保留原名+时间戳)"
                            />

                            {/* SEO优化开关 */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-slate-400">SEO优化命名</label>
                                <button
                                    onClick={() => setSeoOptimizedNaming(!seoOptimizedNaming)}
                                    className={`px-2 py-0.5 text-[9px] rounded transition-colors ${seoOptimizedNaming ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-slate-500'}`}
                                >
                                    {seoOptimizedNaming ? '已启用' : '已禁用'}
                                </button>
                            </div>

                            <div className="text-[9px] text-slate-500">
                                {customFilename ? (
                                    seoOptimizedNaming ? (
                                        <span>🔹 示例: spring-summer-dress{files.length > 1 ? '_001' : ''}.{outputFormat}</span>
                                    ) : (
                                        <span>🔹 示例: {customFilename}{files.length > 1 ? '_001' : ''}.{outputFormat}</span>
                                    )
                                ) : (
                                    seoOptimizedNaming ? (
                                        <span>🔹 示例: img-0076_202601081200589.{outputFormat}</span>
                                    ) : (
                                        <span>🔹 示例: IMG_0076_202601081200589.{outputFormat}</span>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Advanced Editing Section (Collapsible) */}
                        <div className="pt-4 border-t border-white/5">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-white transition-colors py-1"
                            >
                                <span className="uppercase tracking-wider font-bold">🛠️ 高级编辑 (裁剪/调色/旋转)</span>
                                <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
                            </button>

                            {showAdvanced && (
                                <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Rotation & Flip (Moved here) */}
                                    <div className="space-y-1">
                                        <label className="text-sm text-slate-400">旋转 & 翻转</label>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            <button
                                                onClick={() => setRotation((rotation - 90 + 360) % 360)}
                                                className="py-1.5 text-sm bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary-500/50 text-slate-400 hover:text-primary-400 rounded transition-colors"
                                                title="左转90°"
                                            >
                                                ⟲ 左转
                                            </button>
                                            <button
                                                onClick={() => setRotation((rotation + 90) % 360)}
                                                className="py-1.5 text-sm bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary-500/50 text-slate-400 hover:text-primary-400 rounded transition-colors"
                                                title="右转90°"
                                            >
                                                ⟳ 右转
                                            </button>
                                            <button
                                                onClick={() => setFlipH(!flipH)}
                                                className={`py-1.5 text-sm border rounded transition-colors ${flipH ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                                title="水平翻转"
                                            >
                                                ↔ 水平
                                            </button>
                                            <button
                                                onClick={() => setFlipV(!flipV)}
                                                className={`py-1.5 text-sm border rounded transition-colors ${flipV ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                                                title="垂直翻转"
                                            >
                                                ↕ 垂直
                                            </button>
                                        </div>
                                        {(rotation !== 0 || flipH || flipV) && (
                                            <div className="text-[9px] text-primary-400 mt-1">
                                                {rotation !== 0 && `旋转${rotation}° `}
                                                {flipH && '水平翻转 '}
                                                {flipV && '垂直翻转'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-slate-400">裁剪</label>
                                            <button
                                                onClick={() => setCropEnabled(!cropEnabled)}
                                                className={`px-2 py-0.5 text-[9px] rounded transition-colors ${cropEnabled ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-slate-500'}`}
                                            >
                                                {cropEnabled ? '已启用' : '已禁用'}
                                            </button>
                                        </div>
                                        {cropEnabled && (
                                            <div className="grid grid-cols-4 gap-1.5">
                                                <button
                                                    onClick={() => setCropRatio('1:1')}
                                                    className={`py-1.5 text-sm rounded border transition-colors ${cropRatio === '1:1' ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-white/5 border-white/5 text-slate-400'}`}
                                                >
                                                    1:1
                                                </button>
                                                <button
                                                    onClick={() => setCropRatio('16:9')}
                                                    className={`py-1.5 text-sm rounded border transition-colors ${cropRatio === '16:9' ? 'bg-lime-500/10 border-lime-500 text-lime-400' : 'bg-white/5 border-white/5 text-slate-400'}`}
                                                >
                                                    16:9
                                                </button>
                                                <button
                                                    onClick={() => setCropRatio('4:3')}
                                                    className={`py-1.5 text-sm rounded border transition-colors ${cropRatio === '4:3' ? 'bg-lime-500/10 border-lime-500 text-lime-400' : 'bg-white/5 border-white/5 text-slate-400'}`}
                                                >
                                                    4:3
                                                </button>
                                                <button
                                                    onClick={() => setCropRatio('custom')}
                                                    className={`py-1.5 text-sm rounded border transition-colors ${cropRatio === 'custom' ? 'bg-lime-500/10 border-lime-500 text-lime-400' : 'bg-white/5 border-white/5 text-slate-400'}`}
                                                >
                                                    自定义
                                                </button>
                                                <button
                                                    onClick={() => setCropRatio('free')}
                                                    className={`py-1.5 text-sm rounded border transition-colors ${cropRatio === 'free' ? 'bg-lime-500/10 border-lime-500 text-lime-400' : 'bg-white/5 border-white/5 text-slate-400'}`}
                                                >
                                                    自由
                                                </button>
                                            </div>
                                        )}
                                        {cropEnabled && cropRatio === 'custom' && (
                                            <div className="mt-2 text-[9px] text-slate-500 italic bg-white/5 p-2 rounded">
                                                提示：请在上方“尺寸设置”中输入目标宽高，系统将自动进行居中裁剪。
                                            </div>
                                        )}
                                    </div>

                                    {/* Color Adjustments */}
                                    <div className="space-y-2 pt-3 border-t border-white/5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-slate-400">色彩调整</label>
                                            {(brightness !== 1 || contrast !== 1 || saturation !== 1) && (
                                                <button
                                                    onClick={() => {
                                                        setBrightness(1);
                                                        setContrast(1);
                                                        setSaturation(1);
                                                    }}
                                                    className="px-2 py-0.5 text-[9px] bg-white/5 hover:bg-white/10 text-slate-500 hover:text-red-400 rounded transition-colors"
                                                >
                                                    重置
                                                </button>
                                            )}
                                        </div>
                                        {/* Brightness */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-slate-500">亮度</span>
                                                <span className="text-[9px] text-primary-400">{brightness.toFixed(1)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="2"
                                                step="0.1"
                                                value={brightness}
                                                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime-500"
                                            />
                                        </div>
                                        {/* Contrast */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-slate-500">对比度</span>
                                                <span className="text-[9px] text-primary-400">{contrast.toFixed(1)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="2"
                                                step="0.1"
                                                value={contrast}
                                                onChange={(e) => setContrast(parseFloat(e.target.value))}
                                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime-500"
                                            />
                                        </div>
                                        {/* Saturation */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-slate-500">饱和度</span>
                                                <span className="text-[9px] text-primary-400">{saturation.toFixed(1)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="2"
                                                step="0.1"
                                                value={saturation}
                                                onChange={(e) => setSaturation(parseFloat(e.target.value))}
                                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Border & Radius */}
                                    <div className="space-y-2 pt-3 border-t border-white/5">
                                        <label className="text-sm text-slate-400">圆角 & 边框</label>
                                        {/* Border Radius */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-slate-500">圆角</span>
                                                <span className="text-[9px] text-primary-400">{borderRadius}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="50"
                                                value={borderRadius}
                                                onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime-500"
                                            />
                                        </div>
                                        {/* Border Width */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-slate-500">边框宽度</span>
                                                <span className="text-[9px] text-primary-400">{borderWidth}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="20"
                                                value={borderWidth}
                                                onChange={(e) => setBorderWidth(parseInt(e.target.value))}
                                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime-500"
                                            />
                                        </div>
                                        {/* Border Color */}
                                        {borderWidth > 0 && (
                                            <div className="space-y-1">
                                                <span className="text-[9px] text-slate-500">边框颜色</span>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={borderColor}
                                                        onChange={(e) => setBorderColor(e.target.value)}
                                                        className="w-10 h-6 rounded cursor-pointer border border-white/10"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={borderColor}
                                                        onChange={(e) => setBorderColor(e.target.value)}
                                                        className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Metadata Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-slate-400">元数据 (EXIF/IPTC)</label>
                                <button
                                    onClick={() => setShowMetadata(!showMetadata)}
                                    className={`px-2 py-0.5 text-xs rounded transition-colors ${showMetadata ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-slate-500'}`}
                                >
                                    {showMetadata ? '显示' : '隐藏'}
                                </button>
                            </div>

                            {showMetadata && (
                                <MetadataEditor
                                    metadata={metadata}
                                    onChange={setMetadata}
                                    disabled={processing}
                                />
                            )}
                        </div>

                        {/* Presets Management */}
                        <div className="space-y-3 pt-4 border-t border-white/5 pb-2">
                            <h4 className="text-sm text-slate-400 uppercase tracking-wider font-bold flex justify-between">
                                快速预设
                                <button
                                    onClick={handleSavePreset}
                                    className="text-primary-400 hover:text-white transition-colors"
                                >
                                    + 保存当前
                                </button>
                            </h4>

                            {presets.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                    {presets.map(p => (
                                        <div
                                            key={p.name}
                                            className="group relative"
                                        >
                                            <button
                                                onClick={() => handleApplyPreset(p.name)}
                                                className={`w-full px-2 py-2 rounded text-sm text-left transition-all border ${currentPresetName === p.name
                                                    ? 'bg-primary-500/20 border-primary-500 text-primary-400 font-bold'
                                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10 hover:text-white'}`}
                                            >
                                                <div className="truncate pr-4">{p.name}</div>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePreset(e, p.name);
                                                }}
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-all rounded-md hover:bg-red-500/10"
                                                title="删除预设"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[9px] text-slate-600 italic py-2">
                                    暂无预设配置，点击上方 "+" 保存。
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Primary CTA */}
                <div className="p-6 border-t border-white/5 bg-[#0c0c0e]/30">
                    <button
                        onClick={handleProcessBatch}
                        disabled={processing || files.length === 0}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold shadow-xl ${processing || files.length === 0
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:scale-[1.02] hover:shadow-primary-500/20 active:scale-[0.98]'
                            }`}
                    >
                        {processing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>批量处理中...</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 fill-current" />
                                <span>立即导出全部任务</span>
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-slate-600 text-center mt-3">
                        {files.length > 0 ? `当前队列中有 ${files.length} 个任务等待导出` : '请先在左侧导入或生成图片'}
                    </p>
                </div>
            </aside>

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-8 pointer-events-auto" onClick={() => {
                    setPreviewImage(null);
                    setPreviewRemovedBgUrl(null);
                    setIsPreviewLoading(false);
                    setShowOriginalInPreview(false);
                }}>
                    <div className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center gap-4 pointer-events-auto" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => {
                                setPreviewImage(null);
                                setPreviewRemovedBgUrl(null);
                                setIsPreviewLoading(false);
                                setShowOriginalInPreview(false);
                            }}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors z-20"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>

                        <div className={`relative group rounded-xl overflow-hidden p-1 ${(previewRemovedBgUrl && !showOriginalInPreview) ? 'transparent-checkerboard' : 'bg-black/20'}`}>
                            <img
                                src={(previewRemovedBgUrl && !showOriginalInPreview) ? previewRemovedBgUrl : previewImage}
                                alt="Preview"
                                className={`max-w-full max-h-[80vh] object-contain transition-all duration-500 ${isPreviewLoading ? 'opacity-50 blur-sm' : 'opacity-100 blur-0'}`}
                            />

                            {isPreviewLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                                    <div className="w-10 h-10 border-4 border-lime-500/30 border-t-lime-500 rounded-full animate-spin"></div>
                                    <p className="mt-4 text-sm font-bold text-white tracking-widest animate-pulse">AI 分析中...</p>
                                    {previewProgress > 0 && (
                                        <div className="mt-3 w-48">
                                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary-500 transition-all duration-300"
                                                    style={{ width: `${previewProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-base text-white/70 mt-1 text-center">{previewProgress}%</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Preview Controls */}
                        {!previewRemovedBgUrl && !isPreviewLoading && isRemoveBackgroundEnabled && (
                            <button
                                onClick={() => handlePreviewBgRemoval(previewImage)}
                                className="group px-6 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-lime-500/20"
                            >
                                <Sparkles className="w-4 h-4" />
                                生成 AI 抠图预览
                            </button>
                        )}

                        {previewRemovedBgUrl && (
                            <div className="flex flex-col items-center gap-2 pb-2">
                                <button
                                    onClick={() => setShowOriginalInPreview(!showOriginalInPreview)}
                                    className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-base rounded-full transition-all"
                                >
                                    {showOriginalInPreview ? '🔄 显示处理后' : '🔄 对比原图'}
                                </button>
                                <p className="text-[9px] text-slate-500 italic text-center max-w-xs opacity-60">
                                    这是基于本地浏览器的 AI 预览效果。批量导出时将使用更高性能的模型。
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Watermark Preview Panel */}
            {showWatermarkPreview && watermarkText && (
                <div className="fixed bottom-24 right-4 w-96 bg-[#0c0c0e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-40">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-lime-500/10 to-transparent border-b border-white/10">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <svg className="w-4 h-4 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            水印预览
                        </h3>
                        <button
                            onClick={() => setShowWatermarkPreview(false)}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-4">
                        {/* 预览区域 - 模拟图片背景 */}
                        <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-white/5">
                            {/* 网格背景 */}
                            <div className="absolute inset-0 opacity-10" style={{
                                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                                backgroundSize: '20px 20px'
                            }}></div>

                            {/* 水印文字 - 根据位置显示 */}
                            {watermarkPosition === 'center' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span
                                        className="font-bold select-none"
                                        style={{
                                            color: watermarkColor,
                                            fontSize: `${watermarkFontSize * 2}px`,
                                            opacity: watermarkOpacity,
                                            transform: 'rotate(-30deg)',
                                            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                        }}
                                    >
                                        {watermarkText}
                                    </span>
                                </div>
                            )}

                            {watermarkPosition === 'southeast' && (
                                <div className="absolute bottom-3 right-3">
                                    <span
                                        className="font-bold select-none"
                                        style={{
                                            color: watermarkColor,
                                            fontSize: `${watermarkFontSize * 1.5}px`,
                                            opacity: watermarkOpacity,
                                            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                        }}
                                    >
                                        {watermarkText}
                                    </span>
                                </div>
                            )}

                            {watermarkPosition === 'tile' && (
                                <div className="absolute inset-0">
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute"
                                            style={{
                                                left: `${(i % 3) * 33}%`,
                                                top: `${Math.floor(i / 3) * 50}%`,
                                                transform: 'translate(16%, 25%)'
                                            }}
                                        >
                                            <span
                                                className="font-bold select-none"
                                                style={{
                                                    color: watermarkColor,
                                                    fontSize: `${watermarkFontSize * 1.2}px`,
                                                    opacity: watermarkOpacity * 0.7,
                                                    transform: 'rotate(-30deg)',
                                                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                    display: 'inline-block'
                                                }}
                                            >
                                                {watermarkText}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 参数信息 */}
                        <div className="mt-3 space-y-1.5 text-sm text-slate-400">
                            <div className="flex justify-between">
                                <span>颜色:</span>
                                <span className="text-white font-mono">{watermarkColor}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>大小:</span>
                                <span className="text-lime-400">{watermarkFontSize}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>不透明度:</span>
                                <span className="text-lime-400">{Math.round(watermarkOpacity * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>位置:</span>
                                <span className="text-white">
                                    {watermarkPosition === 'center' && '居中'}
                                    {watermarkPosition === 'southeast' && '右下'}
                                    {watermarkPosition === 'tile' && '平铺'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-3 text-[9px] text-slate-600 text-center">
                            ⓘ 这是预览效果,实际水印会根据图片尺寸自动调整大小
                        </div>
                    </div>
                </div>
            )
            }
            {/* API Key Modal */}
            {
                showApiKeyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowApiKeyModal(false)}>
                        <div className="bg-[#18181b] w-full max-w-md rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-6 space-y-5">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-purple-400">
                                        <div className="p-2 bg-purple-500/10 rounded-lg">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">配置 AI 模型</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowApiKeyModal(false)}
                                        className="text-slate-500 hover:text-white transition-colors"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Google Gemini Section */}
                                    <div className="space-y-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                        <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                                            Google Gemini (图片分析与描述)
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500 font-medium ml-1">AI 模型 (Model)</label>
                                            <select
                                                defaultValue={modelName}
                                                id="model-select"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                            >
                                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (推荐 - 快速)</option>
                                                <option value="gemini-1.5-pro">Gemini 1.5 Pro (强力)</option>
                                                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (预览版)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500 font-medium ml-1">Gemini API Key</label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                                                <input
                                                    type="password"
                                                    id="api-key-input"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-600"
                                                    placeholder="Enter Gemini API Key..."
                                                    defaultValue={apiKey}
                                                />
                                            </div>
                                        </div>

                                        {/* Gemini Save Button */}
                                        <button
                                            onClick={() => {
                                                const keyInput = document.getElementById('api-key-input');
                                                const modelSelect = document.getElementById('model-select');
                                                // 只保存 Gemini 相关配置
                                                setApiKey(keyInput.value);
                                                setModelName(modelSelect.value);
                                                localStorage.setItem('gemini-api-key', keyInput.value);
                                                localStorage.setItem('gemini-model', modelSelect.value);
                                                alert('✅ Gemini 配置已保存！');
                                            }}
                                            className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-colors shadow-lg shadow-purple-900/20"
                                        >
                                            保存 Gemini 配置
                                        </button>
                                    </div>

                                    {/* Vector Engine Section */}
                                    <div className="space-y-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                        <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            图片生成 API 配置
                                        </div>

                                        {/* API Provider Selection */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500 font-medium ml-1">API 提供商</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => {
                                                        setApiProvider('google');
                                                        // 自动设置 Google 默认模型
                                                        if (!customModelName || customModelName.includes('flash-image')) {
                                                            setCustomModelName('gemini-2.0-flash-exp');
                                                        }
                                                    }}
                                                    className={`py-2 px-3 text-sm rounded-lg border transition-all ${apiProvider === 'google' ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                                                >
                                                    Google 官方
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setApiProvider('vectorengine');
                                                        // 自动设置 Vector Engine 默认模型
                                                        if (!customModelName || !customModelName.includes('flash-image')) {
                                                            setCustomModelName('gemini-2.5-flash-image');
                                                        }
                                                    }}
                                                    className={`py-2 px-3 text-sm rounded-lg border transition-all ${apiProvider === 'vectorengine' ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                                                >
                                                    Vector Engine
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-slate-600 pl-1">
                                                {apiProvider === 'google' ?
                                                    '使用 Google 官方 Gemini API (需要 Gemini API Key)' :
                                                    '使用 Vector Engine 代理服务'}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500 font-medium ml-1">
                                                {apiProvider === 'google' ? 'Gemini API Key' : 'Vector Engine API Key'}
                                            </label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                                                <input
                                                    type="password"
                                                    id="hf-api-key-input"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                                    placeholder="输入 Vector Engine API Key..."
                                                    defaultValue={hfApiKey}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-600 pl-1">
                                                {apiProvider === 'google' ? (
                                                    <>从 <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-400 hover:underline">Google AI Studio</a> 获取 API Key</>
                                                ) : (
                                                    <>从 <a href="https://api.vectorengine.ai" target="_blank" className="text-blue-400 hover:underline">Vector Engine</a> 获取 API Key</>
                                                )}
                                            </p>
                                        </div>

                                        {/* Custom Model Name Input */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-slate-500 font-medium ml-1">模型名称 (Model)</label>
                                                <span className="text-[9px] text-slate-600">
                                                    {apiProvider === 'google' ? '例: gemini-2.0-flash-exp' : '例: gemini-2.5-flash-image'}
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                value={customModelName}
                                                onChange={(e) => setCustomModelName(e.target.value)}
                                                placeholder="输入模型名称或使用下方快速选择"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                            />
                                        </div>

                                        {/* Quick Preset Models */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500 font-medium ml-1">快速预设模型</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {apiProvider === 'google' ? (
                                                    <>
                                                        <button
                                                            onClick={() => setCustomModelName('gemini-2.0-flash-exp')}
                                                            className={`py-2 px-3 text-sm rounded-lg border transition-all ${customModelName === 'gemini-2.0-flash-exp' ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                                                        >
                                                            Gemini 2.0 Flash Exp (推荐)
                                                        </button>
                                                        <button
                                                            onClick={() => setCustomModelName('gemini-1.5-flash')}
                                                            className={`py-2 px-3 text-sm rounded-lg border transition-all ${customModelName === 'gemini-1.5-flash' ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                                                        >
                                                            Gemini 1.5 Flash
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => setCustomModelName('gemini-2.5-flash-image')}
                                                            className={`py-2 px-3 text-sm rounded-lg border transition-all ${customModelName === 'gemini-2.5-flash-image' ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                                                        >
                                                            Gemini 2.5 Flash Image (推荐)
                                                        </button>
                                                        <button
                                                            onClick={() => setCustomModelName('gemini-1.5-flash-image')}
                                                            className={`py-2 px-3 text-sm rounded-lg border transition-all ${customModelName === 'gemini-1.5-flash-image' ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                                                        >
                                                            Gemini 1.5 Flash Image
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* DALL-E Model Selection (Hidden, kept for fallback) */}
                                        <div className="hidden">
                                            <select value={dalleModel} onChange={(e) => setDalleModel(e.target.value)}>
                                                <option value="dall-e-3">DALL-E 3</option>
                                                <option value="dall-e-2">DALL-E 2</option>
                                            </select>
                                            <select value={dalleSize} onChange={(e) => setDalleSize(e.target.value)}></select>
                                            <select value={dalleQuality} onChange={(e) => setDalleQuality(e.target.value)}></select>
                                        </div>

                                        {/* Save Button */}
                                        <button
                                            onClick={() => {
                                                const hfKeyInput = document.getElementById('hf-api-key-input');
                                                const modelToSave = customModelName.trim() || (apiProvider === 'google' ? 'gemini-2.0-flash-exp' : 'gemini-2.5-flash-image');
                                                // 保存配置
                                                setHfApiKey(hfKeyInput.value);
                                                localStorage.setItem('vector-engine-api-key', hfKeyInput.value);
                                                localStorage.setItem('custom-model-name', customModelName);
                                                localStorage.setItem('api-provider', apiProvider);
                                                alert(`✅ 配置已保存!\nAPI 提供商: ${apiProvider === 'google' ? 'Google 官方' : 'Vector Engine'}\n模型: ${modelToSave}`);
                                            }}
                                            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-900/20"
                                        >
                                            保存配置
                                        </button>
                                    </div>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => setShowApiKeyModal(false)}
                                    className="w-full py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-colors"
                                >
                                    关闭
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

export default App
