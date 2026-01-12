import { useState, useEffect } from 'react';
import { Upload, XCircle, Sparkles, Download, Settings, ChevronRight, Info, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { generateImage, downloadImage, optimizePrompt } from '../services/ai-service';

export default function ImageGenerator() {
    const [textPrompt, setTextPrompt] = useState('');
    const [referenceImage, setReferenceImage] = useState(null);
    const [referenceImagePreview, setReferenceImagePreview] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [generatedBlob, setGeneratedBlob] = useState(null);
    const [error, setError] = useState(null);

    // API settings
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [provider, setProvider] = useState(localStorage.getItem('api_provider') || 'google');
    const [showSettings, setShowSettings] = useState(false);

    // AI Parameters
    const [model, setModel] = useState(localStorage.getItem('ai_model') || (provider === 'google' ? 'gemini-2.0-flash-exp' : 'gemini-2.5-flash-image'));
    const [aspectRatio, setAspectRatio] = useState(localStorage.getItem('ai_aspect_ratio') || '1:1');
    const [quality, setQuality] = useState(localStorage.getItem('ai_quality') || 'standard');
    const [creativity, setCreativity] = useState(parseFloat(localStorage.getItem('ai_creativity')) || 0.7);
    const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);

    // Auto-show settings if no API key
    useEffect(() => {
        if (!apiKey) {
            setShowSettings(true);
        }
    }, []);

    // Handle reference image upload
    const handleReferenceImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReferenceImage(file);
            const reader = new FileReader();
            reader.onload = (e) => setReferenceImagePreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    // Clear reference image
    const clearReferenceImage = () => {
        setReferenceImage(null);
        setReferenceImagePreview(null);
    };

    // Handle generate
    const handleGenerate = async () => {
        if (!apiKey) {
            setError('请先配置 API Key');
            setShowSettings(true);
            return;
        }

        if (!textPrompt.trim()) {
            setError('请输入提示词来开始创作');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const result = await generateImage(textPrompt, apiKey, {
                referenceImage,
                provider,
                model,
                aspectRatio,
                quality
            });

            if (result.success) {
                setGeneratedImage(result.imageUrl);
                setGeneratedBlob(result.blob);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('生成失败，请检查网络或 API Key');
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle download
    const handleDownload = () => {
        if (generatedBlob) {
            const filename = `ai-art-${Date.now()}.png`;
            downloadImage(generatedBlob, filename);
        }
    };

    // Save API settings
    const saveSettings = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        localStorage.setItem('api_provider', provider);
        localStorage.setItem('ai_model', model);
        localStorage.setItem('ai_aspect_ratio', aspectRatio);
        localStorage.setItem('ai_quality', quality);
        localStorage.setItem('ai_creativity', creativity.toString());
        setShowSettings(false);
    };

    // Handle prompt optimization
    const handleOptimizePrompt = async () => {
        if (!textPrompt || !apiKey || isOptimizingPrompt) return;
        setIsOptimizingPrompt(true);
        try {
            const result = await optimizePrompt(textPrompt, apiKey, provider);
            if (result.success) {
                setTextPrompt(result.optimizedText);
            } else {
                setError('优化失败: ' + result.error);
            }
        } catch (err) {
            setError('优化过程中出错');
        } finally {
            setIsOptimizingPrompt(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="text-center space-y-3 lg:space-y-4">
                <div className="inline-flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-3 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm lg:text-xl font-medium animate-float">
                    <Sparkles className="w-4 h-4 lg:w-8 lg:h-8" />
                    <span>Creative AI Studio</span>
                </div>
                <h1 className="text-3xl lg:text-6xl font-black tracking-tight text-white italic">
                    IMAGE <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-blue-400">MARKETING</span>
                </h1>
                <p className="text-slate-400 text-base lg:text-2xl max-w-2xl mx-auto px-4">
                    使用下一代 AI 技术，通过简单的文字描述打造专业级营销素材。
                </p>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Inputs */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="glass-effect rounded-3xl p-4 lg:p-8 space-y-6 overflow-hidden relative">

                        {/* Decorative Background Element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-3xl -z-10 rounded-full"></div>

                        <div className="flex items-center justify-between">
                            <h2 className="text-xl lg:text-3xl font-bold flex items-center gap-2 lg:gap-4">
                                <ChevronRight className="w-5 h-5 lg:w-10 lg:h-10 text-primary-500" />
                                创作中心
                            </h2>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2 lg:p-2.5 rounded-xl transition-all ${showSettings ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            >
                                <Settings className="w-5 h-5 lg:w-10 lg:h-10" />
                            </button>
                        </div>


                        {/* Settings Transition */}
                        {showSettings && (
                            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <h3 className="text-xl font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-4">
                                    <Info className="w-8 h-8" />
                                    API 配置
                                </h3>
                                <div className="grid grid-cols-1 gap-4">

                                    <div className="space-y-2">
                                        <label className="text-lg font-medium text-slate-500 ml-1">服务商</label>
                                        <select
                                            value={provider}
                                            onChange={(e) => setProvider(e.target.value)}
                                            className="w-full bg-slate-950/50 border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                        >
                                            <option value="google">Google Gemini Official</option>
                                            <option value="vectorengine">Vector Engine Proxy</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-lg font-medium text-slate-500 ml-1">API Key</label>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="粘贴您的 Key..."
                                            className="w-full bg-slate-950/50 border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <label className="text-lg font-medium text-slate-500 ml-1">自定义模型名称 (可选)</label>
                                        <input
                                            type="text"
                                            value={model}
                                            onChange={(e) => setModel(e.target.value)}
                                            placeholder="例如: gemini-2.0-flash-exp"
                                            className="w-full bg-slate-950/50 border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-800 pt-4">
                                    <div className="space-y-2">
                                        <label className="text-lg font-medium text-slate-500 ml-1">图片尺寸</label>
                                        <select
                                            value={aspectRatio}
                                            onChange={(e) => setAspectRatio(e.target.value)}
                                            className="w-full bg-slate-950/50 border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-primary-500 outline-none"
                                        >
                                            <option value="1:1">方形 (1:1)</option>
                                            <option value="3:4">竖图 (3:4)</option>
                                            <option value="4:3">横图 (4:3)</option>
                                            <option value="9:16">电影比例 (9:16)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-lg font-medium text-slate-500 ml-1">生成质量</label>
                                        <select
                                            value={quality}
                                            onChange={(e) => setQuality(e.target.value)}
                                            className="w-full bg-slate-950/50 border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-primary-500 outline-none"
                                        >
                                            <option value="standard">标准 (Standard)</option>
                                            <option value="hd">超清 (HD)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 col-span-2 md:col-span-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-lg font-medium text-slate-500 ml-1">创意度</label>
                                            <span className="text-sm font-mono text-primary-400">{Math.round(creativity * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={creativity}
                                            onChange={(e) => setCreativity(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={saveSettings}
                                    className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white text-xl font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20"
                                >
                                    应用并保存
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="text-xl font-medium text-slate-400 ml-1 flex items-center gap-4">
                                <ChevronRight className="w-8 h-8 text-primary-500" />
                                图片描述与参考
                            </label>

                            <div className="flex flex-col lg:flex-row gap-4">
                                {/* Upload Box */}
                                <div className="relative group flex justify-center lg:block">
                                    {referenceImagePreview ? (
                                        <div className="w-24 h-24 lg:w-36 lg:h-36 rounded-2xl overflow-hidden border-2 border-primary-500/30 group-hover:border-primary-500 transition-all shadow-xl">
                                            <img
                                                src={referenceImagePreview}
                                                alt="Reference"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <button
                                                onClick={clearReferenceImage}
                                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-full lg:w-48 h-32 lg:h-48 border-2 border-dashed border-slate-800 hover:border-primary-500/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary-500/5 group text-slate-500 hover:text-primary-400">
                                            <Upload className="w-6 h-6 lg:w-10 lg:h-10 mb-2 transition-transform group-hover:-translate-y-1" />
                                            <span className="text-sm lg:text-lg font-medium">添加参考图</span>
                                            <span className="text-[12px] lg:text-[14px] opacity-40 mt-1">(可选)</span>
                                            <input type="file" accept="image/*" onChange={handleReferenceImageUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>

                                <div className="flex-1 relative group/textarea">
                                    <textarea
                                        value={textPrompt}
                                        onChange={(e) => setTextPrompt(e.target.value)}
                                        placeholder={referenceImage
                                            ? "AI 将参考左侧图片风格，请描述你想生成的内容..."
                                            : "描述你心中的杰作..."}
                                        className="w-full min-h-[140px] lg:min-h-[192px] bg-slate-900/50 border-slate-800 rounded-2xl p-4 lg:p-6 text-base lg:text-xl focus:ring-primary-500 outline-none transition-all placeholder:text-slate-600 pr-12"
                                    />
                                    {textPrompt && (
                                        <button
                                            onClick={handleOptimizePrompt}
                                            disabled={isOptimizingPrompt}
                                            className="absolute right-3 top-3 lg:right-4 lg:top-4 p-2 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-400 hover:bg-primary-500/20 transition-all font-bold"
                                            title="AI 优化提示词"
                                        >
                                            <RefreshCw className={`w-4 h-4 lg:w-5 lg:h-5 ${isOptimizingPrompt ? 'animate-spin' : ''}`} />
                                        </button>
                                    )}
                                </div>
                            </div>


                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !apiKey}
                            className={`w-full group relative overflow-hidden py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 ${isGenerating
                                ? 'bg-slate-800 text-slate-500 cursor-wait'
                                : !apiKey
                                    ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-slate-800'
                                    : 'bg-primary-600 hover:bg-primary-500 text-white shadow-2xl shadow-primary-900/20 active:scale-[0.98]'
                                }`}
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-10 h-10 border-4 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span>正在构思您的杰作...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className={`w-10 h-10 ${apiKey ? 'animate-pulse' : ''}`} />
                                    <span>{apiKey ? '开始生成' : '请先配置 API Key'}</span>
                                    <div className="absolute inset-0 w-1/2 h-full bg-white/10 -skew-x-12 -translate-x-full group-hover:animate-gradient transition-all"></div>
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl animate-in shake duration-500">
                                <AlertCircle className="w-10 h-10 flex-shrink-0" />
                                <p className="text-xl">{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Result */}
                <div className="lg:col-span-5">
                    <div className="glass-card rounded-3xl h-full min-h-[400px] flex flex-col group overflow-hidden">
                        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/20">
                            <h3 className="font-bold flex items-center gap-4 text-slate-300 italic text-xl">
                                <CheckCircle2 className={`w-8 h-8 ${generatedImage ? 'text-green-500' : 'text-slate-700'}`} />
                                PREVIEW
                            </h3>
                            {generatedImage && (
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors"
                                >
                                    <Download className="w-6 h-6" />
                                    DOWNLOAD PNG
                                </button>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                            {generatedImage ? (
                                <div className="relative group/img animate-in zoom-in duration-500">
                                    <img
                                        src={generatedImage}
                                        alt="Output"
                                        className="max-h-[500px] rounded-2xl shadow-2xl border border-slate-700/50 transition-transform duration-700 group-hover/img:scale-[1.02]"
                                    />
                                    <div className="absolute inset-0 bg-primary-500/20 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
                                </div>
                            ) : isGenerating ? (
                                <div className="text-center space-y-8">
                                    <div className="relative">
                                        <div className="w-32 h-32 border-b-4 border-primary-500 rounded-full animate-spin"></div>
                                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-primary-500 animate-pulse" />
                                    </div>
                                    <p className="text-slate-500 animate-pulse font-medium italic tracking-widest text-xl">RENDERING ART...</p>
                                </div>
                            ) : (
                                <div className="text-center space-y-6 opacity-30 select-none">
                                    <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mx-auto ring-8 ring-slate-900">
                                        <Sparkles className="w-16 h-16 text-slate-400" />
                                    </div>
                                    <p className="text-xl font-bold tracking-[0.2em] italic">READY FOR GENERATION</p>
                                </div>
                            )}
                        </div>

                        {/* Visual Footer */}
                        <div className="p-6 bg-slate-950/30">
                            <div className="flex items-center gap-4">
                                <span className="text-[18px] font-black text-slate-700 tracking-tighter uppercase whitespace-nowrap">Status Info</span>
                                <div className="h-[2px] flex-1 bg-slate-800"></div>
                                <span className="text-[18px] text-slate-500 font-medium">
                                    {isGenerating ? 'AI PROCESSING' : generatedImage ? 'GENERATION COMPLETE' : 'IDLE'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Footer */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 px-6 py-12 border-t border-slate-900 mt-12 text-slate-600">
                <div className="flex items-center gap-12">
                    <span className="text-[18px] font-bold tracking-widest uppercase">Privacy Focused</span>
                    <span className="text-[18px] font-bold tracking-widest uppercase">Direct Edge AI</span>
                    <span className="text-[18px] font-bold tracking-widest uppercase">No Cloud Storage</span>
                </div>
                <div className="text-[18px] font-medium opacity-50">
                    © 2026 Batch Image Marketing Tool · Crafted for Professionals
                </div>
            </div>
        </div >
    );
}
