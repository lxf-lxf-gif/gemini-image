import React from 'react';
import { Settings as SettingsIcon, Link, X, Loader2, Sparkles, Zap } from 'lucide-react';
import { Input, Select } from './ui/Input';
import Button from './ui/Button';
import { type SettingsState, type AIProvider } from '../context/settingsStore';

interface WriterConfigProps {
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;
  anchorTexts: { id: string; keyword: string; url: string }[];
  setAnchorTexts: (val: any[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  genMode: 'full' | 'continue' | null;
  className?: string;
  style?: React.CSSProperties;
}

const WriterConfig: React.FC<WriterConfigProps> = ({
  settings,
  updateSettings,
  anchorTexts,
  setAnchorTexts,
  onGenerate,
  isGenerating,
  genMode,
  className,
  style
}) => {
    const [modelInput, setModelInput] = React.useState(settings.model);
    const [imageModelInput, setImageModelInput] = React.useState(settings.imageModel);

    // Sync when settings change externally or on load
    React.useEffect(() => {
        setModelInput(settings.model);
        setImageModelInput(settings.imageModel);
    }, [settings.model, settings.imageModel]);

    const handleModelChange = (val: string) => {
        setModelInput(val);
        updateSettings({ model: val });
    };

    const handleImageModelChange = (val: string) => {
        setImageModelInput(val);
        updateSettings({ imageModel: val });
    };

  return (
    <div className={`writer-config ${className || ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '20px', ...style }}>
      
      {/* 1. Global AI Settings (Only Custom Proxy) */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(129, 140, 248, 0.2)', background: 'rgba(129, 140, 248, 0.05)' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} /> 核心模型配置
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Model Name</label>
                </div>
                <Select
                    value={settings.model}
                    onChange={(e) => handleModelChange(e.target.value)}
                    options={[
                        { label: "Gemini 2.0 Flash Exp (Fastest)", value: "gemini-2.0-flash-exp" },
                        { label: "Gemini 1.5 Flash (Balanced)", value: "gemini-1.5-flash" },
                        { label: "Gemini 1.5 Pro (Reasoning)", value: "gemini-1.5-pro" },
                        { label: "Gemini 1.5 Pro Exp (Latest)", value: "gemini-1.5-pro-exp-0827" },
                    ]}
                />
            </div>
        </div>
      </div>

      {/* Anchor Texts */}
      <div className="config-group">
        <span className="config-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link size={14} /> 锚文本自动化 (Internal Links)
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {anchorTexts.map((item, index) => (
            <div key={item.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1.5fr 32px', gap: '8px', alignItems: 'center'
            }}>
              <Input
                placeholder="关键词"
                value={item.keyword}
                onChange={(e) => {
                  const newTexts = [...anchorTexts];
                  newTexts[index].keyword = e.target.value;
                  setAnchorTexts(newTexts);
                }}
                style={{ padding: '8px', fontSize: '0.8rem' }}
              />
              <Input
                placeholder="URL"
                value={item.url}
                onChange={(e) => {
                  const newTexts = [...anchorTexts];
                  newTexts[index].url = e.target.value;
                  setAnchorTexts(newTexts);
                }}
                style={{ padding: '8px', fontSize: '0.8rem' }}
              />
              <button
                onClick={() => setAnchorTexts(anchorTexts.filter((t) => t.id !== item.id))}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)',
                  border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {anchorTexts.length < 5 && (
            <Button
              variant="secondary"
              style={{
                padding: '8px', fontSize: '0.8rem', width: '100%', marginTop: '4px',
                border: '1px dashed var(--border-color)', background: 'transparent'
              }}
              onClick={() => {
                const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
                setAnchorTexts([...anchorTexts, { id, keyword: '', url: '' }]);
              }}
            >
              + 添加锚文本
            </Button>
          )}
        </div>
      </div>

      <div style={{ marginTop: '8px' }}>
        <Button
          variant="primary"
          onClick={onGenerate}
          disabled={
            isGenerating
          }
          icon={isGenerating && genMode === 'full' ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          style={{
            height: '48px',
            fontSize: '1rem',
            width: '100%',
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
            border: 'none',
            boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)'
          }}
        >
          立即生成文章
        </Button>
      </div>
    </div>
  );
};

export default WriterConfig;
