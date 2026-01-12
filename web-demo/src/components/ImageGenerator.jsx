import { useState, useEffect } from 'react';
import { Upload, XCircle, Sparkles, Download, Settings, ChevronRight, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { generateImage, downloadImage } from '../services/ai-service';

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
        setShowSettings(false);
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium animate-float">
                    <Sparkles className="w-4 h-4" />
                    <span>Creative AI Studio</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white italic">
                    IMAGE <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-blue-400">MARKETING</span>
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    使用下一代 AI 技术，通过简单的文字描述打造专业级营销素材。
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Inputs */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="glass-effect rounded-3xl p-8 space-y-6 overflow-hidden relative">
                        {/* Decorative Background Element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-3xl -z-10 rounded-full"></div>

                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ChevronRight className="w-5 h-5 text-primary-500" />
                                创作中心
                            </h2>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2.5 rounded-xl transition-all ${showSettings ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Settings Transition */}
                        {showSettings && (
                            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    API 配置
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500 ml-1">服务商</label>
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
                                        <label className="text-xs font-medium text-slate-500 ml-1">API Key</label>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="粘贴您的 Key..."
                                            className="w-full bg-slate-950/50 border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <label className="text-xs font-medium text-slate-500 ml-1">自定义模型名称 (可选)</label>
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
                                        <label className="text-xs font-medium text-slate-500 ml-1">图片尺寸</label>
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
                                        <label className="text-xs font-medium text-slate-500 ml-1">生成质量</label>
                                        <select
                                            value={quality}
                                            onChange={(e) => setQuality(e.target.value)}
                                            className="w-full bg-slate-950/50 border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-primary-500 outline-none"
                                        >
                                            <option value="standard">标准 (Standard)</option>
                                            <option value="hd">超清 (HD)</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={saveSettings}
                                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20"
                                >
                                    应用并保存
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                                <ChevronRight className="w-4 h-4 text-primary-500" />
                                图片描述与参考
                            </label>

                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Upload Box */}
                                <div className="relative group">
                                    {referenceImagePreview ? (
                                        <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-primary-500/30 group-hover:border-primary-500 transition-all shadow-xl">
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
                                        <label className="w-36 h-36 border-2 border-dashed border-slate-800 hover:border-primary-500/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary-500/5 group text-slate-500 hover:text-primary-400">
                                            <Upload className="w-6 h-6 mb-2 transition-transform group-hover:-translate-y-1" />
                                            <span className="text-xs font-medium">添加参考图</span>
                                            <span className="text-[10px] opacity-40 mt-1">(可选)</span>
                                            <input type="file" accept="image/*" onChange={handleReferenceImageUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>

                                <textarea
                                    value={textPrompt}
                                    onChange={(e) => setTextPrompt(e.target.value)}
                                    placeholder={referenceImage
                                        ? "AI 将参考左侧图片风格，请描述你想生成的内容..."
                                        : "描述你心中的杰作，例如：'一个赛博朋克风格的未来城市，霓虹灯光映照在雨后的街道'..."}
                                    className="flex-1 min-h-[144px] bg-slate-900/50 border-slate-800 rounded-2xl p-4 text-sm focus:ring-primary-500 outline-none transition-all placeholder:text-slate-600"
                                />
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
                                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span>正在构思您的杰作...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className={`w-6 h-6 ${apiKey ? 'animate-pulse' : ''}`} />
                                    <span>{apiKey ? '开始生成' : '请先配置 API Key'}</span>
                                    <div className="absolute inset-0 w-1/2 h-full bg-white/10 -skew-x-12 -translate-x-full group-hover:animate-gradient transition-all"></div>
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl animate-in shake duration-500">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Result */}
                <div className="lg:col-span-5">
                    <div className="glass-card rounded-3xl h-full min-h-[400px] flex flex-col group overflow-hidden">
                        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/20">
                            <h3 className="font-bold flex items-center gap-2 text-slate-300 italic">
                                <CheckCircle2 className={`w-5 h-5 ${generatedImage ? 'text-green-500' : 'text-slate-700'}`} />
                                PREVIEW
                            </h3>
                            {generatedImage && (
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
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
                                <div className="text-center space-y-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 border-b-2 border-primary-500 rounded-full animate-spin"></div>
                                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary-500 animate-pulse" />
                                    </div>
                                    <p className="text-slate-500 animate-pulse font-medium italic tracking-widest text-sm">RENDERING ART...</p>
                                </div>
                            ) : (
                                <div className="text-center space-y-4 opacity-30 select-none">
                                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto ring-4 ring-slate-900">
                                        <Sparkles className="w-10 h-10 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-bold tracking-[0.2em] italic">READY FOR GENERATION</p>
                                </div>
                            )}
                        </div>

                        {/* Visual Footer */}
                        <div className="p-6 bg-slate-950/30">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-700 tracking-tighter uppercase whitespace-nowrap">Status Info</span>
                                <div className="h-[1px] flex-1 bg-slate-800"></div>
                                <span className="text-[10px] text-slate-500 font-medium">
                                    {isGenerating ? 'AI PROCESSING' : generatedImage ? 'GENERATION COMPLETE' : 'IDLE'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Footer */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-8 border-t border-slate-900 mt-12 text-slate-600">
                <div className="flex items-center gap-6">
                    <span className="text-[10px] font-bold tracking-widest uppercase">Privacy Focused</span>
                    <span className="text-[10px] font-bold tracking-widest uppercase">Direct Edge AI</span>
                    <span className="text-[10px] font-bold tracking-widest uppercase">No Cloud Storage</span>
                </div>
                <div className="text-[11px] font-medium opacity-50">
                    © 2026 Batch Image Marketing Tool · Crafted for Professionals
                </div>
            </div>
        </div >
    );
}
