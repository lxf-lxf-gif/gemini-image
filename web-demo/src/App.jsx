import { useState, useRef, useEffect } from 'react'
import { Upload, Image as ImageIcon, Play, XCircle, FolderOpen, Check, AlertCircle, ArrowRight, Sparkles, Key, Settings, Download, Info, ChevronRight, Tag, FileText, User, Hash, RotateCcw, RotateCw, Type, Maximize, Scissors, Palette, Box, Layers, Sliders, Save, CornerUpRight, RefreshCw, ChevronDown } from 'lucide-react'
import MetadataEditor from './components/MetadataEditor'
import { generateImage, downloadImage, optimizePrompt } from './services/ai-service'
import { processImage } from './services/canvas-engine'
import JSZip from 'jszip'

// 有效图片格式
const VALID_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif']

function App() {
    const [files, setFiles] = useState([]); // Array: { fileObject, id, previewUrl, processStatus: 'pending'|'processing'|'success'|'error', errorMsg, alt, newName }
    const [processing, setProcessing] = useState(false);
    const [completed, setCompleted] = useState(0);
    const [currentProcessingFile, setCurrentProcessingFile] = useState('');

    // Settings State
    const [resizeWidth, setResizeWidth] = useState('');
    const [resizeHeight, setResizeHeight] = useState('');
    const [watermarkText, setWatermarkText] = useState('');
    const [watermarkPosition, setWatermarkPosition] = useState('center');
    const [watermarkColor, setWatermarkColor] = useState('#ffffff');
    const [watermarkFontSize, setWatermarkFontSize] = useState(6);
    const [watermarkOpacity, setWatermarkOpacity] = useState(0.6);
    const [watermarkEnabled, setWatermarkEnabled] = useState(false);
    const [outputFormat, setOutputFormat] = useState('jpeg');
    const [quality, setQuality] = useState(80);

    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [customFilename, setCustomFilename] = useState('');
    const [seoOptimizedNaming, setSeoOptimizedNaming] = useState(false);

    // Crop & adjustments
    const [cropEnabled, setCropEnabled] = useState(false);
    const [cropRatio, setCropRatio] = useState('free');
    const [brightness, setBrightness] = useState(1.0);
    const [contrast, setContrast] = useState(1.0);
    const [saturation, setSaturation] = useState(1.0);
    const [borderRadius, setBorderRadius] = useState(0);
    const [borderWidth, setBorderWidth] = useState(0);
    const [borderColor, setBorderColor] = useState('#000000');

    // Metadata & AI
    const [metadata, setMetadata] = useState({ title: '', description: '', alt: '', keywords: [], author: '', copyright: '' });
    const [showMetadata, setShowMetadata] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [apiProvider, setApiProvider] = useState(localStorage.getItem('api_provider') || 'google');
    const [modelName, setModelName] = useState(localStorage.getItem('ai_model') || (apiProvider === 'google' ? 'gemini-2.0-flash-exp' : 'gemini-2.5-flash-image'));
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [textToImagePrompt, setTextToImagePrompt] = useState('');
    const [referenceImage, setReferenceImage] = useState(null);
    const [referenceImagePreview, setReferenceImagePreview] = useState(null);

    // AI Params
    const [aspectRatio, setAspectRatio] = useState(localStorage.getItem('ai_aspect_ratio') || '1:1');
    const [aiQuality, setAiQuality] = useState(localStorage.getItem('ai_quality') || 'standard');
    const [creativity, setCreativity] = useState(parseFloat(localStorage.getItem('ai_creativity')) || 0.7);
    const [batchSize, setBatchSize] = useState(parseInt(localStorage.getItem('ai_batch_size')) || 1);
    const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);

    // Theme State
    const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'palette-1');
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [activeTab, setActiveTab] = useState('canvas'); // 'canvas', 'edit', 'export'


    const fileInputRef = useRef(null);
    const referenceInputRef = useRef(null);

    // Initial check
    useEffect(() => {
        if (!apiKey) setShowApiKeyModal(true);
    }, []);

    // Theme management
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('app_theme', theme);
    }, [theme]);

    const themes = [
        { id: 'palette-1', name: '经典浅色', colors: ['#ff6e6c', '#fbdd74'], desc: 'Classic Light' },
        { id: 'palette-2', name: '柔和紫调', colors: ['#ff6e6c', '#67568c'], desc: 'Soft Purple' },
        { id: 'palette-3', name: '深邃优雅', colors: ['#7f5af0', '#2cb67d'], desc: 'Dark Elegant' },
        { id: 'palette-4', name: '海洋蓝调', colors: ['#f582ae', '#8bd3dd'], desc: 'Ocean Blue' },
        { id: 'palette-5', name: '温暖日落', colors: ['#f25f4c', '#ff8906'], desc: 'Warm Sunset' },
        { id: 'palette-6', name: '清新薄荷', colors: ['#ffd803', '#bae8e8'], desc: 'Fresh Mint' },
        { id: 'palette-7', name: '深夜模式', colors: ['#ff8906', '#f25f4c'], desc: 'Deep Night' },
        { id: 'palette-8', name: '粉色梦境', colors: ['#ff8ba7', '#ffc6c7'], desc: 'Pastel Dream' }
    ];

    const handleSelectFiles = () => fileInputRef.current?.click();

    const handleBrowserFiles = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const newFiles = selectedFiles.map(file => ({
            fileObject: file,
            id: Math.random().toString(36).substr(2, 9),
            previewUrl: URL.createObjectURL(file),
            processStatus: 'pending',
            newName: '',
            alt: ''
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleDragDrop = (e) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        const newFiles = droppedFiles.map(file => ({
            fileObject: file,
            id: Math.random().toString(36).substr(2, 9),
            previewUrl: URL.createObjectURL(file),
            processStatus: 'pending',
            newName: '',
            alt: ''
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleSelectReferenceImage = () => referenceInputRef.current?.click();
    const handleReferenceUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReferenceImage(file);
            setReferenceImagePreview(URL.createObjectURL(file));
        }
    };

    const handleOptimizePrompt = async () => {
        if (!textToImagePrompt || !apiKey || isOptimizingPrompt) return;
        setIsOptimizingPrompt(true);
        try {
            const result = await optimizePrompt(textToImagePrompt, apiKey, apiProvider);
            if (result.success) {
                setTextToImagePrompt(result.optimizedText);
            } else {
                alert('优化失败: ' + result.error);
            }
        } catch (err) {
            alert('优化过程中出错');
        } finally {
            setIsOptimizingPrompt(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!apiKey || !textToImagePrompt.trim()) return;
        setIsGeneratingImage(true);
        try {
            for (let i = 0; i < batchSize; i++) {
                const result = await generateImage(textToImagePrompt, apiKey, {
                    referenceImage,
                    provider: apiProvider,
                    model: modelName,
                    aspectRatio,
                    quality: aiQuality,
                    temperature: creativity
                });

                if (result.success) {
                    const newFile = {
                        fileObject: result.blob,
                        id: Math.random().toString(36).substr(2, 9),
                        previewUrl: result.imageUrl,
                        processStatus: 'success',
                        isGenerated: true,
                        newName: `ai-${Date.now()}-${i + 1}.${outputFormat}`
                    };
                    setFiles(prev => [newFile, ...prev]);
                } else {
                    alert(`第 ${i + 1} 张生成失败: ` + result.error);
                    break; // Stop batch on error
                }
            }
            setTextToImagePrompt('');
        } catch (err) {
            alert('发生错误');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleProcessBatch = async () => {
        if (files.length === 0 || processing) return;

        setProcessing(true);
        setCompleted(0);
        const zip = new JSZip();

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setCurrentProcessingFile(file.fileObject?.name || '图片');

                // 1. Determine processed name (SEO logic)
                let finalName = file.newName || file.fileObject?.name?.split('.')[0] || `image-${file.id}`;
                if (customFilename) {
                    finalName = `${customFilename}-${i + 1}`;
                }

                // 2. Process Image through Canvas Engine
                const settings = {
                    rotation, flipH, flipV, brightness, contrast, saturation,
                    watermarkEnabled, watermarkText, watermarkColor, watermarkOpacity,
                    borderRadius, borderWidth, borderColor,
                    outputFormat, quality,
                    cropEnabled, cropRatio
                };

                const result = await processImage(file, settings);

                // 3. Add to ZIP
                zip.file(`${finalName}.${outputFormat}`, result.blob);

                // 4. Update UI statuses
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, processStatus: 'success' } : f));
                setCompleted(i + 1);
            }

            // 5. Generate and trigger ZIP download
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `marketing_batch_${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert('批量处理完成！ZIP 已开始下载。');
        } catch (err) {
            console.error('Batch error:', err);
            alert('处理过程中发生错误: ' + err.message);
        } finally {
            setProcessing(false);
            setCurrentProcessingFile('');
        }
    };

    const handleSingleDownload = async (file) => {
        try {
            const settings = {
                rotation, flipH, flipV, brightness, contrast, saturation,
                watermarkEnabled, watermarkText, watermarkColor, watermarkOpacity,
                borderRadius, borderWidth, borderColor,
                outputFormat, quality,
                cropEnabled, cropRatio
            };
            const result = await processImage(file, settings);

            const link = document.createElement('a');
            link.href = result.previewUrl;
            link.download = result.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            alert('下载失败');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-[#020617] text-slate-300 font-sans selection:bg-primary-500/30 overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            {/* MOBILE TOP BAR (Optional, keeping it clean for now) */}

            {/* LEFT SIDEBAR: Brand & Adjustments */}
            <aside className={`w-full lg:w-80 flex-col border-r border-white/5 bg-[#0c0c0e] z-30 ${activeTab === 'edit' ? 'flex' : 'hidden lg:flex'}`} style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>

                <div className="h-14 flex items-center px-4 border-b border-white/5 bg-black/20 justify-between" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center shadow-lg shadow-primary-900/40" style={{ background: `linear-gradient(to bottom right, var(--accent-primary), var(--accent-secondary))` }}>
                            <Box className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-black text-white tracking-tight text-2xl italic uppercase" style={{ color: 'var(--text-primary)' }}>IMAGE <span className="text-primary-400" style={{ color: 'var(--accent-primary)' }}>MARKETING</span></span>
                    </div>

                    {/* Theme Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowThemeSelector(!showThemeSelector)}
                            className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                            title="切换主题"
                        >
                            <Palette className="w-4 h-4 text-slate-400 group-hover:text-primary-400 transition-colors" style={{ color: 'var(--text-muted)' }} />
                        </button>

                        {showThemeSelector && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowThemeSelector(false)} />
                                <div className="absolute top-12 right-0 w-72 bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                                    <div className="flex items-center justify-between px-3 py-2 mb-2">
                                        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Happy Hues 配色</div>
                                        <div className="text-[9px] font-bold text-slate-500" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>{themes.length} 个主题</div>
                                    </div>

                                    <div className="space-y-1">
                                        {themes.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    setTheme(t.id);
                                                    setShowThemeSelector(false);
                                                }}
                                                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all ${theme === t.id ? 'bg-primary-500/10 border border-primary-500/30' : 'hover:bg-white/5'}`}
                                                style={theme === t.id ? { backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent-primary)', borderWidth: '1px' } : {}}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1">
                                                        {t.colors.map((color, i) => (
                                                            <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-col items-start">
                                                        <span className={`text-xl font-bold ${theme === t.id ? 'text-primary-400' : 'text-slate-300'}`} style={{ color: theme === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{t.name}</span>
                                                        <span className="text-[16px] text-slate-500" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{t.desc}</span>
                                                    </div>
                                                </div>
                                                {theme === t.id && <Check className="w-4 h-4 text-primary-400" style={{ color: 'var(--accent-primary)' }} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-10 custom-scrollbar">
                    {/* Brand & Watermark */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[22px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                                <Type className="w-8 h-8 text-primary-500" /> 品牌 & 水印
                            </h3>
                            <button
                                onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                                className={`w-10 h-5 rounded-full transition-all relative ${watermarkEnabled ? 'bg-primary-500 shadow-lg shadow-primary-500/20' : 'bg-slate-800'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${watermarkEnabled ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className={`space-y-4 transition-all duration-300 ${watermarkEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none scale-95'}`}>
                            <div className="space-y-1.5">
                                <label className="text-[20px] text-slate-600 font-bold uppercase ml-1">水印文字</label>
                                <input
                                    type="text"
                                    value={watermarkText}
                                    onChange={(e) => setWatermarkText(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3.5 text-lg text-slate-300 focus:border-primary-500 outline-none transition-all placeholder:text-slate-700 shadow-inner"
                                    placeholder="输入您的店铺/品牌名"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[20px] text-slate-600 font-bold uppercase ml-1">颜色</label>
                                    <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-1.5 overflow-hidden">
                                        <input type="color" value={watermarkColor} onChange={(e) => setWatermarkColor(e.target.value)} className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer" />
                                        <span className="text-[18px] font-mono text-slate-500">{watermarkColor.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[20px] text-slate-600 font-bold uppercase ml-1">不透明度</label>
                                    <input type="range" min="0" max="1" step="0.1" value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))} className="w-full h-2 accent-primary-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Adjustments */}
                    <div className="space-y-5">
                        <h3 className="text-[22px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                            <Sliders className="w-8 h-8 text-primary-500" /> 高级调整
                        </h3>

                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-bold text-slate-400">AI 一键抠图</span>
                                <div className="px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-[16px] text-primary-400 font-black uppercase">Alpha</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button onClick={() => setRotation(r => (r - 90) % 360)} className="group py-5 flex flex-col items-center gap-2 rounded-2xl bg-black/40 border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all">
                                    <RotateCcw className="w-8 h-8 text-slate-500 group-hover:text-primary-400" />
                                    <span className="text-[16px] font-bold text-slate-600 uppercase">左旋</span>
                                </button>
                                <button onClick={() => setRotation(r => (r + 90) % 360)} className="group py-5 flex flex-col items-center gap-2 rounded-2xl bg-black/40 border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all">
                                    <RotateCw className="w-8 h-8 text-slate-500 group-hover:text-primary-400" />
                                    <span className="text-[16px] font-bold text-slate-600 uppercase">右旋</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button onClick={() => setFlipH(!flipH)} className={`group py-5 flex flex-col items-center gap-2 rounded-2xl border transition-all ${flipH ? 'bg-primary-500/10 border-primary-500/50' : 'bg-black/40 border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5'}`}>
                                    <ArrowRight className={`w-8 h-8 transform scale-x-[-1] ${flipH ? 'text-primary-400' : 'text-slate-500 group-hover:text-primary-400'}`} />
                                    <span className={`text-[16px] font-bold uppercase ${flipH ? 'text-primary-400' : 'text-slate-600'}`}>水平翻转</span>
                                </button>
                                <button onClick={() => setFlipV(!flipV)} className={`group py-5 flex flex-col items-center gap-2 rounded-2xl border transition-all ${flipV ? 'bg-primary-500/10 border-primary-500/50' : 'bg-black/40 border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5'}`}>
                                    <ArrowRight className={`w-8 h-8 transform rotate-90 ${flipV ? 'text-primary-400' : 'text-slate-500 group-hover:text-primary-400'}`} />
                                    <span className={`text-[16px] font-bold uppercase ${flipV ? 'text-primary-400' : 'text-slate-600'}`}>垂直翻转</span>
                                </button>
                            </div>
                        </div>

                        {/* Crop Settings */}
                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-bold text-slate-400">智能裁剪</span>
                                <button
                                    onClick={() => setCropEnabled(!cropEnabled)}
                                    className={`w-8 h-4 rounded-full transition-all relative ${cropEnabled ? 'bg-primary-500 shadow-lg shadow-primary-500/20' : 'bg-slate-800'}`}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${cropEnabled ? 'left-4' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {cropEnabled && (
                                <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-top-2 duration-300">
                                    {['1:1', '16:9', '4:3', 'free'].map(ratio => (
                                        <button
                                            key={ratio}
                                            onClick={() => setCropRatio(ratio)}
                                            className={`py-3 text-[16px] font-black uppercase rounded-xl border transition-all ${cropRatio === ratio ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-black/40 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Border & Radius */}
                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-4">
                            <span className="text-xl font-bold text-slate-400">边框与圆角</span>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[18px] text-slate-600 font-black uppercase tracking-widest">圆角</label>
                                        <span className="text-[18px] text-primary-500 font-mono">{borderRadius}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="50" step="1"
                                        value={borderRadius}
                                        onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                                        className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-primary-500"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[18px] text-slate-600 font-black uppercase tracking-widest">边框宽度</label>
                                        <span className="text-[18px] text-primary-500 font-mono">{borderWidth}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="20" step="1"
                                        value={borderWidth}
                                        onChange={(e) => setBorderWidth(parseInt(e.target.value))}
                                        className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-primary-500"
                                    />
                                </div>

                                {borderWidth > 0 && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                        <label className="text-[18px] text-slate-600 font-black uppercase tracking-widest">边框颜色</label>
                                        <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-1.5">
                                            <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer" />
                                            <span className="text-[18px] font-mono text-slate-500">{borderColor.toUpperCase()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 px-1">
                            {['brightness', 'contrast', 'saturation'].map(adj => (
                                <div key={adj} className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[20px] text-slate-600 font-black uppercase tracking-wide">{adj}</label>
                                        <span className="text-[20px] text-primary-500 font-mono">{(adj === 'brightness' ? brightness : adj === 'contrast' ? contrast : saturation).toFixed(1)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="2" step="0.1"
                                        value={adj === 'brightness' ? brightness : adj === 'contrast' ? contrast : saturation}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (adj === 'brightness') setBrightness(val);
                                            else if (adj === 'contrast') setContrast(val);
                                            else setSaturation(val);
                                        }}
                                        className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-primary-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Metadata Section toggle */}
                    <button
                        onClick={() => setShowMetadata(!showMetadata)}
                        className={`w-full py-5 rounded-2xl border flex items-center justify-center gap-3 font-black text-lg uppercase tracking-wider transition-all ${showMetadata ? 'bg-primary-500 border-primary-500 text-white shadow-xl shadow-primary-500/20' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}
                    >
                        <Tag className="w-4 h-4" />
                        {showMetadata ? '隐藏元数据' : '配置 SEO 元数据'}
                    </button>

                    {showMetadata && (
                        <div className="animate-in slide-in-from-top-4 duration-300">
                            <MetadataEditor metadata={metadata} onChange={setMetadata} />
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN AREA */}
            <main className={`flex-1 flex flex-col relative overflow-hidden bg-[#020617] ${activeTab === 'canvas' ? 'flex' : 'hidden lg:flex'}`} style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="absolute inset-0 bg-radial-gradient from-primary-900/10 via-transparent to-transparent pointer-events-none" />

                {/* Status Bar */}
                <div className="h-14 lg:h-20 border-b border-white/5 bg-black/40 backdrop-blur-xl px-4 lg:px-10 flex items-center justify-between relative overflow-hidden flex-shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                    {/* Background Progress Bar */}
                    {processing && (
                        <div
                            className="absolute top-0 left-0 h-1 bg-primary-500/30 transition-all duration-500 z-0"
                            style={{ width: `${(completed / files.length) * 100}%` }}
                        />
                    )}

                    <div className="flex items-center gap-3 lg:gap-6 relative z-10 overflow-hidden">
                        <div className="flex items-center gap-2 px-2 lg:px-3 py-0.5 lg:py-1 bg-white/5 rounded-full border border-white/5 whitespace-nowrap" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                            <div className={`w-1 lg:w-1.5 h-1 lg:h-1.5 rounded-full ${processing ? 'bg-primary-500 animate-ping' : 'bg-green-500'}`} style={{ backgroundColor: processing ? 'var(--accent-primary)' : '#10b981' }} />
                            <span className="text-[10px] lg:text-[13px] font-bold text-slate-500 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                                {processing ? '运行中' : '就绪'}
                            </span>
                        </div>
                        <div className="h-3 lg:h-4 w-px bg-white/10" style={{ backgroundColor: 'var(--border-color)' }} />
                        <span className="text-[12px] lg:text-base font-bold text-slate-400 italic truncate" style={{ color: 'var(--text-secondary)' }}>
                            {processing ? `${completed}/${files.length}` : `队列: ${files.length}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSelectFiles} className="p-2 lg:p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"><Upload className="w-4 h-4" /></button>
                        <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary-600/10 border border-primary-600/20 text-primary-400 rounded-xl text-xs font-bold hover:bg-primary-600/20 transition-all">
                            <Save className="w-3.5 h-3.5" /> 保存预设
                        </button>
                    </div>
                </div>

                {/* Grid Canvas Area */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-10 relative z-10 custom-scrollbar">
                    {files.length === 0 ? (
                        <div
                            onDrop={handleDragDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[40px] lg:rounded-[56px] bg-slate-900/20 backdrop-blur-md transition-all hover:bg-slate-900/30 group animate-in zoom-in duration-700 p-6 text-center"
                        >
                            <div className="w-20 lg:w-32 h-20 lg:h-32 bg-primary-500/10 rounded-[32px] lg:rounded-[40px] flex items-center justify-center mb-6 lg:mb-8 border border-primary-500/20 shadow-2xl group-hover:scale-110 transition-all">
                                <Upload className="w-8 lg:w-12 h-8 lg:h-12 text-primary-400" />
                            </div>
                            <h2 className="text-3xl lg:text-5xl font-black text-white italic mb-2 lg:mb-3 tracking-tight uppercase">开启创作之旅</h2>
                            <p className="text-slate-500 mb-8 lg:mb-10 max-w-sm font-medium text-[16px] lg:text-lg">批量生成与优化社交营销素材</p>
                            <button
                                onClick={handleSelectFiles}
                                className="group px-8 lg:px-12 py-4 lg:py-5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-black rounded-[20px] lg:rounded-[24px] shadow-3xl shadow-primary-900/40 hover:scale-105 transition-all flex items-center gap-3 lg:gap-4 uppercase tracking-widest text-lg lg:text-xl"
                            >
                                <Play className="w-4 lg:w-5 h-4 lg:h-5 fill-current" /> 导入素材
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-24 lg:pb-0">
                            {files.map(file => (
                                <div key={file.id} className="group glass-card rounded-2xl lg:rounded-3xl overflow-hidden hover:scale-[1.05] transition-all hover:shadow-3xl hover:shadow-primary-500/20 border border-white/5 relative bg-slate-900/40">
                                    <div className="aspect-[4/5] bg-black/40 overflow-hidden relative transparent-checkerboard">
                                        <img src={file.previewUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 lg:group-hover:opacity-100 transition-all flex items-end p-4">
                                            <button
                                                onClick={() => handleSingleDownload(file)}
                                                className="w-full py-2 bg-primary-500 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                                            >
                                                <Download className="w-3" /> 保存此项
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))}
                                            className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-xl text-white/40 hover:text-red-400 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all border border-white/10"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                        {file.isGenerated && (
                                            <div className="absolute top-3 left-3 px-2 py-0.5 bg-primary-500 text-white text-[8px] font-black uppercase rounded shadow-lg">AI Generated</div>
                                        )}
                                    </div>
                                    <div className="p-3 lg:p-4 border-t border-white/5 bg-black/20">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-tighter">{file.fileObject?.name || 'Untitled Project'}</p>
                                            <Check className="w-3 h-3 text-green-500/50" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div
                                onClick={handleSelectFiles}
                                className="aspect-[4/5] rounded-2xl lg:rounded-3xl border-2 border-dashed border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-primary-500/5 opacity-0 group-hover:opacity-100 transition-all" />
                                <Upload className="w-8 lg:w-10 h-8 lg:h-10 text-slate-700 group-hover:text-primary-400 mb-2 lg:mb-3 group-hover:-translate-y-1 transition-all" />
                                <span className="text-[14px] lg:text-[18px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-400">导入更多</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM AI PANEL */}
                <div className="px-4 lg:px-10 py-6 lg:py-8 relative z-50 bg-black/40 backdrop-blur-xl border-t border-white/5 lg:bg-transparent lg:border-none flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="max-w-6xl mx-auto space-y-4">
                        {/* Advanced Controls Row */}
                        <div className="flex flex-col lg:flex-row gap-4 animate-in slide-in-from-bottom-2 duration-500">
                            <div className="flex-1 glass-card rounded-2xl p-4 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 lg:gap-8">
                                <div className="flex-1 w-full space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[16px] lg:text-[18px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary-500" /> 创意度
                                        </label>
                                        <span className="text-[16px] lg:text-[18px] text-primary-400 font-mono">{Math.round(creativity * 100)}%</span>
                                    </div>
                                    <input type="range" min="0" max="1" step="0.1" value={creativity} onChange={(e) => {
                                        setCreativity(parseFloat(e.target.value));
                                        localStorage.setItem('ai_creativity', e.target.value);
                                    }} className="w-full h-2 bg-white/5 rounded-full appearance-none accent-primary-500" />
                                </div>
                                <div className="hidden sm:block h-8 w-px bg-white/10" />
                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                                    <span className="text-[16px] lg:text-[18px] text-slate-500 font-black uppercase tracking-widest">批量</span>
                                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                                        {[1, 2, 4].map(num => (
                                            <button key={num} onClick={() => {
                                                setBatchSize(num);
                                                localStorage.setItem('ai_batch_size', num.toString());
                                            }} className={`px-3 lg:px-6 py-1.5 lg:py-2 rounded-lg text-sm lg:text-[18px] font-black transition-all ${batchSize === num ? 'bg-primary-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                                {num}P
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-80 glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-center gap-2">
                            <label className="text-[16px] lg:text-[18px] text-slate-500 font-black uppercase tracking-widest">生成模型</label>
                            <select
                                value={modelName}
                                onChange={(e) => {
                                    setModelName(e.target.value);
                                    localStorage.setItem('ai_model', e.target.value);
                                }}
                                className="bg-black/20 border border-white/5 rounded-xl px-3 py-3 text-base lg:text-lg font-bold text-primary-400 outline-none"
                            >
                                <optgroup label="Google Gemini" className="bg-[#0c0c0e]">
                                    <option value="gemini-3-pro-image-preview">Gemini 3 Pro (Image)</option>
                                    <option value="gemini-2.5-flash-image-preview">Gemini 2.5 Flash</option>
                                    <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                </optgroup>
                                <optgroup label="OpenAI / Other" className="bg-[#0c0c0e]">
                                    <option value="dall-e-3">DALL-E 3</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>

                    {/* Main Input Card */}
                    <div className="glass-card rounded-[32px] lg:rounded-[40px] p-2 pr-2 lg:pr-6 border border-primary-500/20 shadow-4xl shadow-primary-900/20 relative group overflow-hidden">
                        <div className="absolute -inset-24 bg-primary-500/5 blur-[100px] rounded-full -z-10 animate-pulse-slow" />

                        <div className="flex flex-col lg:flex-row gap-2 lg:gap-6 items-stretch lg:items-center">
                            <div className="p-2 lg:pl-4 flex gap-4 items-center justify-between lg:justify-start">
                                <div className="relative group/ref">
                                    {referenceImagePreview ? (
                                        <div className="w-16 lg:w-20 h-16 lg:h-20 rounded-2xl lg:rounded-[24px] overflow-hidden border-2 border-primary-500/30 relative shadow-2xl animate-in zoom-in">
                                            <img src={referenceImagePreview} className="w-full h-full object-cover" />
                                            <button onClick={() => { setReferenceImage(null); setReferenceImagePreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-all"><XCircle className="w-3 h-3" /></button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={handleSelectReferenceImage}
                                            className="w-16 lg:w-24 h-16 lg:h-24 border-2 border-dashed border-white/10 rounded-2xl lg:rounded-[28px] flex flex-col items-center justify-center cursor-pointer hover:border-primary-500/50 hover:bg-primary-500/5 group/btn transition-all duration-500"
                                        >
                                            <ImageIcon className="w-6 lg:w-8 h-6 lg:h-8 text-slate-700 group-hover/btn:text-primary-400 group-hover/btn:-translate-y-1 transition-all" />
                                            <span className="text-[10px] lg:text-[14px] font-black text-slate-700 uppercase mt-1 tracking-tighter">参考图</span>
                                        </div>
                                    )}
                                </div>
                                <div className="h-10 w-px bg-white/5 hidden lg:block" />
                                <div className="flex-1 lg:hidden">
                                    <select
                                        value={aspectRatio}
                                        onChange={(e) => {
                                            setAspectRatio(e.target.value);
                                            localStorage.setItem('ai_aspect_ratio', e.target.value);
                                        }}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[14px] font-black uppercase tracking-widest text-primary-400 outline-none"
                                    >
                                        <option value="1:1">1:1</option>
                                        <option value="16:9">16:9</option>
                                        <option value="9:16">9:16</option>
                                        <option value="4:3">4:3</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col lg:flex-row items-stretch lg:items-center gap-4 px-2 lg:px-0">
                                <div className="flex-1 relative">
                                    <textarea
                                        value={textToImagePrompt}
                                        onChange={(e) => setTextToImagePrompt(e.target.value)}
                                        placeholder="描述您想生成的杰作..."
                                        className="w-full max-h-24 lg:max-h-32 py-4 lg:py-4 pr-14 lg:pr-12 bg-transparent border-none outline-none text-base lg:text-xl placeholder:text-slate-700 resize-none font-medium custom-scrollbar"
                                    />

                                    {textToImagePrompt && (
                                        <button
                                            onClick={handleOptimizePrompt}
                                            disabled={isOptimizingPrompt}
                                            className="absolute right-2 lg:right-3 top-1/2 -translate-y-1/2 p-2.5 lg:p-2 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-400 hover:bg-primary-500/20 transition-all font-bold z-10"
                                        >
                                            <RefreshCw className={`w-4 h-4 lg:w-5 lg:h-5 ${isOptimizingPrompt ? 'animate-spin' : ''}`} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-4 lg:pr-2 pb-2 lg:pb-0">
                                    <select
                                        value={aspectRatio}
                                        onChange={(e) => {
                                            setAspectRatio(e.target.value);
                                            localStorage.setItem('ai_aspect_ratio', e.target.value);
                                        }}
                                        className="hidden lg:block bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-[18px] font-black uppercase tracking-widest text-primary-400 outline-none hover:bg-black/60 transition-all"
                                    >
                                        <option value="1:1">1:1 Square</option>
                                        <option value="16:9">16:9 Cinema</option>
                                        <option value="9:16">9:16 Story</option>
                                        <option value="4:3">4:3 Photo</option>
                                    </select>

                                    <button
                                        onClick={handleGenerateImage}
                                        disabled={isGeneratingImage || !apiKey}
                                        className="w-full sm:w-auto group relative overflow-hidden py-4 lg:py-6 px-8 lg:px-12 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-[20px] lg:rounded-[28px] font-black text-lg lg:text-xl uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-30"
                                    >
                                        {isGeneratingImage ? <RefreshCw className="w-6 lg:w-8 h-6 lg:h-8 animate-spin" /> : <Sparkles className="w-6 lg:w-8 h-6 lg:h-8" />}
                                        <span>{isGeneratingImage ? '构思中' : '开始生成'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* FOOTER BAR */}
                <div className="h-12 lg:h-16 bg-black/60 backdrop-blur-md border-t border-white/5 flex items-center px-4 lg:px-8 justify-between z-50 flex-shrink-0" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-4 lg:gap-8 text-[12px] lg:text-[18px] font-black tracking-widest uppercase overflow-hidden">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-slate-700 italic" style={{ color: 'var(--text-muted)' }}>版本</span>
                            <span className="text-slate-500" style={{ color: 'var(--text-secondary)' }}>2.0 Pro</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary-500/60 whitespace-nowrap" style={{ color: 'var(--accent-primary)', opacity: 0.6 }}>
                            <Layers className="w-4 lg:w-6 h-4 lg:h-6" />
                            <span className="hidden sm:inline">Active</span>
                        </div>
                    </div>
                    <div className="hidden md:block text-[14px] lg:text-[16px] font-bold text-slate-700 italic tracking-tighter" style={{ color: 'var(--text-muted)' }}>© 2026 Batch Image Marketing</div>
                </div>
            </main>

            {/* RIGHT SIDEBAR: Export & Presets */}
            <aside className={`w-full lg:w-80 flex-col border-l border-white/5 bg-[#0c0c0e] z-30 ${activeTab === 'export' ? 'flex' : 'hidden lg:flex'}`} style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="h-14 flex items-center px-6 border-b border-white/5 bg-black/20" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="font-black text-white uppercase tracking-wider text-sm" style={{ color: 'var(--text-primary)' }}>导出控制台</span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-12 custom-scrollbar">
                    {/* Output Params */}
                    <div className="space-y-6">
                        <h3 className="text-[22px] font-black text-slate-600 uppercase tracking-[0.15em]">导出配置</h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[13px] text-slate-500 font-black uppercase ml-1">输出格式</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['JPEG', 'PNG', 'WebP'].map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setOutputFormat(fmt.toLowerCase())}
                                            className={`py-2.5 text-[18px] font-black rounded-xl border transition-all ${outputFormat === fmt.toLowerCase() ? 'bg-primary-500/10 border-primary-500 text-white shadow-lg shadow-primary-500/10' : 'bg-white/5 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {['AVIF', 'TIFF', 'GIF'].map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setOutputFormat(fmt.toLowerCase())}
                                            className={`py-2.5 text-[18px] font-black rounded-xl border transition-all ${outputFormat === fmt.toLowerCase() ? 'bg-primary-500/10 border-primary-500 text-white shadow-lg shadow-primary-500/10' : 'bg-white/5 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[20px] text-slate-500 font-black uppercase ml-1">输出质量</label>
                                    <span className="text-[20px] text-primary-500 font-mono">{quality}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10" max="100" step="5"
                                    value={quality}
                                    onChange={(e) => setQuality(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-primary-500"
                                />
                                <p className="text-[16px] text-slate-700 italic">适用于 JPEG/WebP 格式，越高文件越大</p>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[13px] text-slate-500 font-black uppercase ml-1">智能重命名</label>
                                <input
                                    type="text"
                                    value={customFilename}
                                    onChange={(e) => setCustomFilename(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3.5 text-base text-slate-300 focus:border-primary-500 outline-none transition-all placeholder:text-slate-800"
                                    placeholder="例如: marketing_summer"
                                />
                                <div onClick={() => setSeoOptimizedNaming(!seoOptimizedNaming)} className="flex items-center gap-2 cursor-pointer group mt-2">
                                    <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${seoOptimizedNaming ? 'bg-primary-500 border-primary-500' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>
                                        {seoOptimizedNaming && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-[20px] font-black uppercase text-slate-600 group-hover:text-slate-400 transition-colors tracking-wide">开启 SEO 文件名优化</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="space-y-4">
                        <h3 className="text-[22px] font-black text-slate-600 uppercase tracking-[0.15em]">常用尺寸</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { n: 'Blog', s: '800x600' },
                                { n: 'Ins', s: '1080x1080' },
                                { n: 'Small', s: '400x400' },
                                { n: 'Medium', s: '1200x800' }
                            ].map(p => (
                                <button key={p.n} className="group p-4 flex flex-col items-start gap-2 rounded-2xl bg-white/5 border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all text-left">
                                    <span className="text-[20px] font-black text-slate-300 uppercase tracking-wider group-hover:text-primary-400">{p.n}</span>
                                    <span className="text-[18px] font-bold text-slate-600 font-mono italic">{p.s}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Final Action */}
                    <div className="pt-4 space-y-4">
                        <button
                            onClick={handleProcessBatch}
                            disabled={files.length === 0}
                            className="w-full h-16 bg-gradient-to-r from-primary-600 to-blue-600 text-white font-black text-xl uppercase tracking-[0.2em] rounded-3xl shadow-3xl shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group disabled:opacity-30 disabled:grayscale"
                        >
                            <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                            批量导出
                        </button>
                        <p className="text-[18px] text-slate-700 text-center uppercase font-black leading-relaxed tracking-widest">通过智能 Canvas 引擎为您自动应用所有水印与滤镜</p>
                    </div>
                </div>
            </aside>

            {/* API PROVIDER MODAL */}
            {showApiKeyModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500">
                    <div className="w-full max-w-lg glass-card rounded-[48px] p-10 border border-white/10 shadow-4xl relative overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[120px] -z-10 rounded-full" />

                        <div className="flex flex-col items-center mb-10">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-blue-600 rounded-[32px] flex items-center justify-center mb-6 shadow-2xl relative">
                                <Key className="w-10 h-10 text-white" />
                                <div className="absolute inset-0 bg-white/20 rounded-[32px] animate-pulse" />
                            </div>
                            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">配置您的创意引擎</h2>
                            <p className="text-slate-500 text-xl font-medium">输入 API Key 即可永久激活全功能 AI 实验室</p>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setApiProvider('google')}
                                    className={`py-6 rounded-3xl border font-black text-[18px] uppercase tracking-widest transition-all ${apiProvider === 'google' ? 'bg-primary-500 border-primary-500 text-white shadow-xl shadow-primary-500/10' : 'bg-slate-900 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                >
                                    Google Official
                                </button>
                                <button
                                    onClick={() => setApiProvider('vectorengine')}
                                    className={`py-6 rounded-3xl border font-black text-[18px] uppercase tracking-widest transition-all ${apiProvider === 'vectorengine' ? 'bg-primary-500 border-primary-500 text-white shadow-xl shadow-primary-500/10' : 'bg-slate-900 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                >
                                    Vector Engine
                                </button>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[18px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">密钥令牌 (API KEY)</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full bg-slate-900 border border-white/10 rounded-[28px] py-6 px-10 text-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all placeholder:text-slate-800 text-white font-mono"
                                        placeholder="································"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => {
                                        localStorage.setItem('gemini_api_key', apiKey);
                                        localStorage.setItem('api_provider', apiProvider);
                                        setShowApiKeyModal(false);
                                    }}
                                    className="w-full py-6 bg-gradient-to-r from-primary-600 to-blue-600 text-white font-black rounded-[28px] transition-all shadow-3xl shadow-primary-600/30 active:scale-95 uppercase tracking-[0.2em] text-xl"
                                >
                                    立即激活引擎
                                </button>
                                <button onClick={() => setShowApiKeyModal(false)} className="w-full text-center text-[16px] text-slate-700 hover:text-slate-400 transition-colors uppercase font-black tracking-[0.3em]">稍后配置 (暂存本地)</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE NAVIGATION BAR */}
            <nav className="lg:hidden flex h-20 items-center border-t border-white/10 bg-black/80 backdrop-blur-xl z-[60] px-6 pb-[env(safe-area-inset-bottom)]" style={{ backgroundColor: 'rgba(12, 12, 14, 0.85)', borderColor: 'var(--border-color)' }}>
                <button
                    onClick={() => setActiveTab('edit')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'edit' ? 'text-primary-500 scale-110' : 'text-slate-500'}`}
                    style={{ color: activeTab === 'edit' ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                >
                    <Sliders className="w-6 h-6" />
                    <span className="text-[12px] font-black uppercase tracking-widest">调整</span>
                </button>
                <div className="flex items-center -mt-6">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-primary-500/40 active:scale-95 transition-all border-4 border-[#020617] relative z-10 ${activeTab === 'canvas' ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-black' : ''}`}
                        onClick={() => setActiveTab('canvas')}
                    >
                        <Play className={`w-7 h-7 text-white ${activeTab === 'canvas' ? 'fill-current' : ''}`} />
                    </div>
                </div>
                <button
                    onClick={() => setActiveTab('export')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'export' ? 'text-primary-500 scale-110' : 'text-slate-500'}`}
                    style={{ color: activeTab === 'export' ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                >
                    <Download className="w-6 h-6" />
                    <span className="text-[12px] font-black uppercase tracking-widest">导出</span>
                </button>
            </nav>

            <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleBrowserFiles} />
            <input type="file" ref={referenceInputRef} className="hidden" onChange={handleReferenceUpload} />
        </div>
    )
}

export default App
