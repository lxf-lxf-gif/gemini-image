import React, { useState, useEffect } from 'react';
import { Tag, FileText, User, Hash, Info } from 'lucide-react';

const MetadataEditor = ({ metadata, onChange, disabled }) => {
    // metadata structure: { title, description, alt, keywords, author, copyright }
    const [tags, setTags] = useState([]);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (metadata.keywords) {
            setTags(typeof metadata.keywords === 'string'
                ? metadata.keywords.split(',').map(k => k.trim()).filter(k => k)
                : (Array.isArray(metadata.keywords) ? metadata.keywords : [])
            );
        } else {
            setTags([]);
        }
    }, [metadata.keywords]);

    const handleInputChange = (field, value) => {
        onChange({ ...metadata, [field]: value });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = () => {
        const value = inputValue.trim();
        if (value && !tags.includes(value)) {
            const newTags = [...tags, value];
            setTags(newTags);
            setInputValue('');
            handleInputChange('keywords', newTags);
        }
    };

    const removeTag = (index) => {
        const newTags = tags.filter((_, i) => i !== index);
        setTags(newTags);
        handleInputChange('keywords', newTags);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4" />
                EXIF/IPTC 元数据
            </h3>

            {/* Title */}
            <div className="space-y-1">
                <label className="text-sm text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> 标题
                </label>
                <input
                    type="text"
                    value={metadata.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    disabled={disabled}
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-base text-white focus:border-primary-500 outline-none transition-colors disabled:opacity-50"
                    placeholder="图片标题"
                />
            </div>

            {/* Description */}
            <div className="space-y-1">
                <label className="text-sm text-slate-400 flex items-center gap-1">
                    <Info className="w-3 h-3" /> 描述
                </label>
                <textarea
                    value={metadata.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    disabled={disabled}
                    rows={3}
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-base text-white focus:border-primary-500 outline-none transition-colors resize-none disabled:opacity-50"
                    placeholder="图片详细描述..."
                />
            </div>

            {/* Alt Text (SEO) */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-400 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Alt 文本 (SEO)
                    </label>
                    <span className={`text-xs ${(metadata.alt?.length || 0) > 125 ? 'text-red-400' : 'text-slate-500'}`}>
                        {metadata.alt?.length || 0}/125
                    </span>
                </div>
                <textarea
                    value={metadata.alt || ''}
                    onChange={(e) => handleInputChange('alt', e.target.value)}
                    disabled={disabled}
                    rows={2}
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-base text-white focus:border-primary-500 outline-none transition-colors resize-none disabled:opacity-50"
                    placeholder="简洁的图片替代文本,用于 SEO 和无障碍访问..."
                />
                {(metadata.alt?.length || 0) > 125 && (
                    <p className="text-xs text-red-400">⚠️ 建议控制在 125 字符以内以获得最佳 SEO 效果</p>
                )}
            </div>

            {/* Keywords/Tags */}
            <div className="space-y-1">
                <label className="text-sm text-slate-400 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> 关键词 (回车添加)
                </label>
                <div className={`flex flex-wrap gap-1.5 bg-black/20 border border-white/10 rounded px-2 py-1.5 min-h-[36px] ${disabled ? 'opacity-50' : 'focus-within:border-primary-500'}`}>
                    {tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center gap-1 bg-primary-500/20 text-primary-400 text-sm px-1.5 py-0.5 rounded">
                            {tag}
                            {!disabled && (
                                <button onClick={() => removeTag(index)} className="hover:text-white">
                                    &times;
                                </button>
                            )}
                        </span>
                    ))}
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={addTag}
                        disabled={disabled}
                        className="bg-transparent border-none outline-none text-base text-white flex-1 min-w-[60px]"
                        placeholder={tags.length === 0 ? "输入标签..." : ""}
                    />
                </div>
            </div>

            {/* Author */}
            <div className="space-y-1">
                <label className="text-sm text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3" /> 作者/版权
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <input
                        type="text"
                        value={metadata.author || ''}
                        onChange={(e) => handleInputChange('author', e.target.value)}
                        disabled={disabled}
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-base text-white focus:border-primary-500 outline-none transition-colors disabled:opacity-50"
                        placeholder="作者"
                    />
                    <input
                        type="text"
                        value={metadata.copyright || ''}
                        onChange={(e) => handleInputChange('copyright', e.target.value)}
                        disabled={disabled}
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-base text-white focus:border-primary-500 outline-none transition-colors disabled:opacity-50"
                        placeholder="版权声明"
                    />
                </div>
            </div>
        </div>
    );
};

export default MetadataEditor;
