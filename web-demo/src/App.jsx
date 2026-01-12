import { useState, useRef, useEffect } from 'react'
import { Upload, Image as ImageIcon, Play, XCircle, FolderOpen, Check, AlertCircle, ArrowRight, Sparkles, Key, Settings, Download, Info, ChevronRight, Tag, FileText, User, Hash, RotateCcw, RotateCw, Type, Maximize, Scissors, Palette, Box, Layers, Sliders, Save, CornerUpRight, RefreshCw } from 'lucide-react'
import MetadataEditor from './components/MetadataEditor'
import { generateImage, downloadImage } from './services/ai-service'

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
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [aiQuality, setAiQuality] = useState('standard');

    const fileInputRef = useRef(null);
    const referenceInputRef = useRef(null);

    // Initial check
    useEffect(() => {
        if (!apiKey) setShowApiKeyModal(true);
    }, []);

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

    const handleGenerateImage = async () => {
        if (!apiKey || !textToImagePrompt.trim()) return;
        setIsGeneratingImage(true);
        try {
            const result = await generateImage(textToImagePrompt, apiKey, {
                referenceImage, provider: apiProvider, model: modelName, aspectRatio, quality: aiQuality
            });
            if (result.success) {
                const newFile = {
                    fileObject: result.blob,
                    id: Math.random().toString(36).substr(2, 9),
                    previewUrl: result.imageUrl,
                    processStatus: 'success',
                    isGenerated: true,
                    newName: `ai-${Date.now()}.${outputFormat}`
                };
                setFiles(prev => [newFile, ...prev]);
                setTextToImagePrompt('');
            } else {
                alert('生成失败: ' + result.error);
            }
        } catch (err) {
            alert('发生错误');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleProcessBatch = () => {
        alert('Web 版批量导出正在开发中。目前您可以点击图片下的下载按钮单独保存。');
    };

    const handleSingleDownload = (file) => {
        const link = document.createElement('a');
        link.href = file.previewUrl;
        link.download = file.newName || file.fileObject?.name || `image-${file.id}.${outputFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex h-screen bg-[#020617] text-slate-300 font-sans selection:bg-primary-500/30 overflow-hidden">
            {/* LEFT SIDEBAR: Brand & Adjustments */}
            <aside className="w-80 flex flex-col border-r border-white/5 bg-[#0c0c0e] z-30">
                <div className="h-14 flex items-center px-4 border-b border-white/5 bg-black/20">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center shadow-lg shadow-primary-900/40">
                            <Box className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-black text-white tracking-tight text-2xl italic uppercase">IMAGE <span className="text-primary-400">MARKETING</span></span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-10 custom-scrollbar">
                    {/* Brand & Watermark */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[14px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                                <Type className="w-5 h-5 text-primary-500" /> 品牌 & 水印
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
                                <label className="text-[13px] text-slate-600 font-bold uppercase ml-1">水印文字</label>
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
                                    <label className="text-[13px] text-slate-600 font-bold uppercase ml-1">颜色</label>
                                    <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-1.5 overflow-hidden">
                                        <input type="color" value={watermarkColor} onChange={(e) => setWatermarkColor(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer" />
                                        <span className="text-[10px] font-mono text-slate-500">{watermarkColor.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] text-slate-600 font-bold uppercase ml-1">不透明度</label>
                                    <input type="range" min="0" max="1" step="0.1" value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))} className="w-full accent-primary-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Adjustments */}
                    <div className="space-y-5">
                        <h3 className="text-[14px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-primary-500" /> 高级调整
                        </h3>

                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-base font-bold text-slate-400">AI 一键抠图</span>
                                <div className="px-2 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-[9px] text-primary-400 font-black uppercase">Alpha</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button onClick={() => setRotation(r => (r - 90) % 360)} className="group py-3 flex flex-col items-center gap-2 rounded-2xl bg-black/40 border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all">
                                    <RotateCcw className="w-5 h-5 text-slate-500 group-hover:text-primary-400" />
                                    <span className="text-[9px] font-bold text-slate-600 uppercase">左旋</span>
                                </button>
                                <button onClick={() => setRotation(r => (r + 90) % 360)} className="group py-3 flex flex-col items-center gap-2 rounded-2xl bg-black/40 border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all">
                                    <RotateCw className="w-5 h-5 text-slate-500 group-hover:text-primary-400" />
                                    <span className="text-[9px] font-bold text-slate-600 uppercase">右旋</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button onClick={() => setFlipH(!flipH)} className={`group py-3 flex flex-col items-center gap-2 rounded-2xl border transition-all ${flipH ? 'bg-primary-500/10 border-primary-500/50' : 'bg-black/40 border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5'}`}>
                                    <ArrowRight className={`w-5 h-5 transform scale-x-[-1] ${flipH ? 'text-primary-400' : 'text-slate-500 group-hover:text-primary-400'}`} />
                                    <span className={`text-[9px] font-bold uppercase ${flipH ? 'text-primary-400' : 'text-slate-600'}`}>水平翻转</span>
                                </button>
                                <button onClick={() => setFlipV(!flipV)} className={`group py-3 flex flex-col items-center gap-2 rounded-2xl border transition-all ${flipV ? 'bg-primary-500/10 border-primary-500/50' : 'bg-black/40 border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5'}`}>
                                    <ArrowRight className={`w-5 h-5 transform rotate-90 ${flipV ? 'text-primary-400' : 'text-slate-500 group-hover:text-primary-400'}`} />
                                    <span className={`text-[9px] font-bold uppercase ${flipV ? 'text-primary-400' : 'text-slate-600'}`}>垂直翻转</span>
                                </button>
                            </div>
                        </div>

                        {/* Crop Settings */}
                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">智能裁剪</span>
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
                                            className={`py-2 text-[9px] font-black uppercase rounded-xl border transition-all ${cropRatio === ratio ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-black/40 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Border & Radius */}
                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-4">
                            <span className="text-xs font-bold text-slate-400">边框与圆角</span>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest">圆角</label>
                                        <span className="text-[10px] text-primary-500 font-mono">{borderRadius}px</span>
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
                                        <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest">边框宽度</label>
                                        <span className="text-[10px] text-primary-500 font-mono">{borderWidth}px</span>
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
                                        <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest">边框颜色</label>
                                        <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-1.5">
                                            <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer" />
                                            <span className="text-[10px] font-mono text-slate-500">{borderColor.toUpperCase()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 px-1">
                            {['brightness', 'contrast', 'saturation'].map(adj => (
                                <div key={adj} className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[13px] text-slate-600 font-black uppercase tracking-wide">{adj}</label>
                                        <span className="text-[13px] text-primary-500 font-mono">{(adj === 'brightness' ? brightness : adj === 'contrast' ? contrast : saturation).toFixed(1)}</span>
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
            <main className="flex-1 flex flex-col relative overflow-hidden bg-[#020617]">
                <div className="absolute inset-0 bg-radial-gradient from-primary-900/10 via-transparent to-transparent pointer-events-none" />

                {/* Header (Secondary) */}
                <div className="h-14 flex items-center justify-between px-8 border-b border-white/5 bg-black/10 relative z-40 backdrop-blur-sm">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[13px] font-bold text-slate-500 uppercase tracking-wide">系统就绪</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <span className="text-base font-bold text-slate-400 italic">当前队列: <span className="text-primary-500">{files.length}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSelectFiles} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"><Upload className="w-4 h-4" /></button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600/10 border border-primary-600/20 text-primary-400 rounded-xl text-xs font-bold hover:bg-primary-600/20 transition-all">
                            <Save className="w-3.5 h-3.5" /> 保存预设
                        </button>
                    </div>
                </div>

                {/* Grid Canvas */}
                <div className="flex-1 overflow-y-auto p-10 relative z-10 custom-scrollbar">
                    {files.length === 0 ? (
                        <div
                            onDrop={handleDragDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[56px] bg-slate-900/20 backdrop-blur-md transition-all hover:bg-slate-900/30 group animate-in zoom-in duration-700"
                        >
                            <div className="w-32 h-32 bg-primary-500/10 rounded-[40px] flex items-center justify-center mb-8 border border-primary-500/20 shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all">
                                <Upload className="w-12 h-12 text-primary-400" />
                            </div>
                            <h2 className="text-5xl font-black text-white italic mb-3 tracking-tight uppercase">开启您的创作之旅</h2>
                            <p className="text-slate-500 mb-10 max-w-sm text-center font-medium text-lg">拖入多张图片，AI 将为您批量生成与优化社交营销素材</p>
                            <button
                                onClick={handleSelectFiles}
                                className="group px-12 py-5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-black rounded-[24px] shadow-3xl shadow-primary-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 uppercase tracking-widest text-xl"
                            >
                                <Play className="w-5 h-5 fill-current" /> 立即导入素材库
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            {files.map(file => (
                                <div key={file.id} className="group glass-card rounded-3xl overflow-hidden hover:scale-[1.05] transition-all hover:shadow-3xl hover:shadow-primary-500/20 border border-white/5 relative bg-slate-900/40">
                                    <div className="aspect-[4/5] bg-black/40 overflow-hidden relative transparent-checkerboard">
                                        <img src={file.previewUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end p-4">
                                            <button
                                                onClick={() => handleSingleDownload(file)}
                                                className="w-full py-2 bg-primary-500 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                                            >
                                                <Download className="w-3" /> 保存此项
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))}
                                            className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-xl text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                        {file.isGenerated && (
                                            <div className="absolute top-3 left-3 px-2 py-0.5 bg-primary-500 text-white text-[8px] font-black uppercase rounded shadow-lg">AI Generated</div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-white/5 bg-black/20">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-tighter">{file.fileObject?.name || 'Untitled Project'}</p>
                                            <Check className="w-3 h-3 text-green-500/50" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div
                                onClick={handleSelectFiles}
                                className="aspect-[4/5] rounded-3xl border-2 border-dashed border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-primary-500/5 opacity-0 group-hover:opacity-100 transition-all" />
                                <Upload className="w-8 h-8 text-slate-700 group-hover:text-primary-400 mb-3 group-hover:-translate-y-1 transition-all" />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-400">导入更多素材</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM AI PANEL */}
                <div className="px-10 py-8 relative z-50">
                    <div className="max-w-5xl mx-auto">
                        <div className="glass-card rounded-[40px] p-2 pr-6 border border-primary-500/20 shadow-4xl shadow-primary-900/20 overflow-hidden relative group">
                            {/* Animated Background Flow */}
                            <div className="absolute -inset-24 bg-primary-500/10 blur-[100px] rounded-full -z-10 animate-pulse-slow" />

                            <div className="flex gap-6 items-center">
                                <div className="p-1 pl-4 flex gap-4 items-center">
                                    <div className="relative group/ref">
                                        {referenceImagePreview ? (
                                            <div className="w-20 h-20 rounded-[24px] overflow-hidden border-2 border-primary-500/30 relative shadow-2xl animate-in zoom-in">
                                                <img src={referenceImagePreview} className="w-full h-full object-cover" />
                                                <button onClick={() => { setReferenceImage(null); setReferenceImagePreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-all"><XCircle className="w-3 h-3" /></button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={handleSelectReferenceImage}
                                                className="w-20 h-20 border-2 border-dashed border-white/10 rounded-[28px] flex flex-col items-center justify-center cursor-pointer hover:border-primary-500/50 hover:bg-primary-500/5 group/btn transition-all duration-500"
                                            >
                                                <ImageIcon className="w-6 h-6 text-slate-700 group-hover/btn:text-primary-400 group-hover/btn:-translate-y-1 transition-all" />
                                                <span className="text-[9px] font-black text-slate-700 uppercase mt-1 tracking-tighter">参考图</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="h-10 w-px bg-white/5" />
                                </div>

                                <div className="flex-1 flex items-center gap-4">
                                    <textarea
                                        value={textToImagePrompt}
                                        onChange={(e) => setTextToImagePrompt(e.target.value)}
                                        placeholder="描述您想生成的杰作，AI 将为您实时构建..."
                                        className="flex-1 max-h-24 py-2 bg-transparent border-none outline-none text-slate-100 text-sm placeholder:text-slate-700 resize-none font-medium custom-scrollbar"
                                    />

                                    <div className="flex items-center gap-2 pr-2">
                                        <select
                                            value={aspectRatio}
                                            onChange={(e) => setAspectRatio(e.target.value)}
                                            className="bg-black/40 border border-white/5 rounded-2xl px-3 py-3 text-[10px] font-black uppercase tracking-widest text-primary-400 outline-none hover:bg-black/60 transition-all"
                                        >
                                            <option value="1:1">1:1 Square</option>
                                            <option value="16:9">16:9 Cinema</option>
                                            <option value="9:16">9:16 Story</option>
                                            <option value="4:3">4:3 Photo</option>
                                        </select>

                                        <button
                                            onClick={handleGenerateImage}
                                            disabled={isGeneratingImage || !apiKey}
                                            className="group relative overflow-hidden py-4 px-10 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl shadow-primary-600/20 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                                        >
                                            {isGeneratingImage ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                            {isGeneratingImage ? '构思中...' : '开始生成'}
                                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 -skew-x-12" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER BAR */}
                <div className="h-10 bg-black/60 backdrop-blur-md border-t border-white/5 flex items-center px-8 justify-between z-50">
                    <div className="flex items-center gap-8 text-[10px] font-black tracking-widest uppercase">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-700 italic">Version</span>
                            <span className="text-slate-500">2.0 Professional Web</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary-500/60">
                            <Layers className="w-3 h-3" />
                            <span>Canvas Processor Active</span>
                        </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-700 italic tracking-tighter">© 2026 Batch Image Marketing · Crafted for Professionals</div>
                </div>
            </main>

            {/* RIGHT SIDEBAR: Export & Presets */}
            <aside className="w-80 flex flex-col border-l border-white/5 bg-[#0c0c0e] z-30">
                <div className="h-14 flex items-center px-6 border-b border-white/5 bg-black/20">
                    <span className="font-black text-white uppercase tracking-wider text-sm">导出控制台</span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-12 custom-scrollbar">
                    {/* Output Params */}
                    <div className="space-y-6">
                        <h3 className="text-[14px] font-black text-slate-600 uppercase tracking-[0.15em]">导出配置</h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[13px] text-slate-500 font-black uppercase ml-1">输出格式</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['JPEG', 'PNG', 'WebP'].map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setOutputFormat(fmt.toLowerCase())}
                                            className={`py-2.5 text-[10px] font-black rounded-xl border transition-all ${outputFormat === fmt.toLowerCase() ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-lg shadow-primary-500/10' : 'bg-white/5 border-white/5 text-slate-600 hover:text-slate-400'}`}
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
                                            className={`py-2.5 text-[10px] font-black rounded-xl border transition-all ${outputFormat === fmt.toLowerCase() ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-lg shadow-primary-500/10' : 'bg-white/5 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[13px] text-slate-500 font-black uppercase ml-1">输出质量</label>
                                    <span className="text-[13px] text-primary-500 font-mono">{quality}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10" max="100" step="5"
                                    value={quality}
                                    onChange={(e) => setQuality(parseInt(e.target.value))}
                                    className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-primary-500"
                                />
                                <p className="text-[9px] text-slate-700 italic">适用于 JPEG/WebP 格式，越高文件越大</p>
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
                                    <span className="text-[12px] font-black uppercase text-slate-600 group-hover:text-slate-400 transition-colors tracking-wide">开启 SEO 文件名优化</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="space-y-4">
                        <h3 className="text-[14px] font-black text-slate-600 uppercase tracking-[0.15em]">常用尺寸</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { n: 'Blog', s: '800x600' },
                                { n: 'Ins', s: '1080x1080' },
                                { n: 'Small', s: '400x400' },
                                { n: 'Medium', s: '1200x800' }
                            ].map(p => (
                                <button key={p.n} className="group p-3 flex flex-col items-start gap-1 rounded-2xl bg-white/5 border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all text-left">
                                    <span className="text-[13px] font-black text-slate-300 uppercase tracking-wider group-hover:text-primary-400">{p.n}</span>
                                    <span className="text-[12px] font-bold text-slate-600 font-mono italic">{p.s}</span>
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
                        <p className="text-[9px] text-slate-700 text-center uppercase font-black leading-relaxed tracking-widest">通过智能 Canvas 引擎为您自动应用所有水印与滤镜</p>
                    </div>
                </div>
            </aside>

            {/* API PROVIDER MODAL */}
            {showApiKeyModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500">
                    <div className="w-full max-w-lg glass-card rounded-[48px] p-10 border border-white/10 shadow-4xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[120px] -z-10 rounded-full" />

                        <div className="flex flex-col items-center mb-10">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-blue-600 rounded-[32px] flex items-center justify-center mb-6 shadow-2xl relative">
                                <Key className="w-10 h-10 text-white" />
                                <div className="absolute inset-0 bg-white/20 rounded-[32px] animate-pulse" />
                            </div>
                            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">配置您的创意引擎</h2>
                            <p className="text-slate-500 text-sm font-medium">输入 API Key 即可永久激活全功能 AI 实验室</p>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setApiProvider('google')}
                                    className={`py-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest transition-all ${apiProvider === 'google' ? 'bg-primary-500 border-primary-500 text-white shadow-xl shadow-primary-500/10' : 'bg-slate-900 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                >
                                    Google Official
                                </button>
                                <button
                                    onClick={() => setApiProvider('vectorengine')}
                                    className={`py-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest transition-all ${apiProvider === 'vectorengine' ? 'bg-primary-500 border-primary-500 text-white shadow-xl shadow-primary-500/10' : 'bg-slate-900 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                >
                                    Vector Engine
                                </button>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">密钥令牌 (API KEY)</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full bg-slate-900 border border-white/10 rounded-[28px] py-5 px-8 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all placeholder:text-slate-800 text-white font-mono"
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
                                    className="w-full py-5 bg-gradient-to-r from-primary-600 to-blue-600 text-white font-black rounded-[28px] transition-all shadow-3xl shadow-primary-600/30 active:scale-95 uppercase tracking-[0.2em] text-sm"
                                >
                                    立即激活引擎
                                </button>
                                <button onClick={() => setShowApiKeyModal(false)} className="w-full text-center text-[10px] text-slate-700 hover:text-slate-400 transition-colors uppercase font-black tracking-[0.3em]">稍后配置 (暂存本地)</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleBrowserFiles} />
            <input type="file" ref={referenceInputRef} className="hidden" onChange={handleReferenceUpload} />
        </div>
    )
}

export default App
