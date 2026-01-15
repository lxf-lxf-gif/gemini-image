import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Trash2, Copy, Github, History as HistoryIcon, Sparkles, Eye, X, Image as ImageIcon, Download } from 'lucide-react';
import { type HistoryItem } from '../context/historyStore';
import { useHistory } from '../context/useHistory';
import { useSettings } from '../context/useSettings';
import { useToast } from '../context/useToast';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import ReactMarkdown from 'react-markdown';
import showdown from 'showdown';
import { imageDb } from '../services/imageDb';
import ChartBlock from '../components/ChartBlock';
import { dirtyJsonParse, generateEChartsOption, isChartConfig, chartConfigToImage } from '../utils/chartUtils';

const History: React.FC = () => {
  const { history, deleteFromHistory, clearHistory } = useHistory();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});
  const [exportMenuOpenId, setExportMenuOpenId] = useState<string | null>(null);

  // Restore images for preview
  useEffect(() => {
    if (!previewItem) {
      // Cleanup blobs when closing preview
      Object.values(previewImages).forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      setPreviewImages({});
      return;
    }

    const loadImages = async () => {
      const regex = /!\[([\s\S]*?)\]\((.*?)\)/g;
      const matches = Array.from(previewItem.content.matchAll(regex));
      const prompts = matches.map(m => {
          // Clean prompt just like in Writer
          const alt = m[1];
          return alt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      });

      const newImages: Record<string, string> = {};
      
      for (const prompt of prompts) {
        try {
          // Check if it's already a blob url in content (unlikely in history unless just saved)
          // Actually history content usually has ai-image://placeholder or old blob url
          
          const record = await imageDb.getImageByPrompt(prompt);
          if (record && record.base64) {
             const res = await fetch(record.base64);
             const blob = await res.blob();
             newImages[prompt] = URL.createObjectURL(blob);
          }
        } catch (e) {
          console.error('Failed to restore image for preview:', prompt, e);
        }
      }
      setPreviewImages(newImages);
    };

    loadImages();
  }, [previewItem]);

  const handleCopy = async (item: HistoryItem) => {
    try {
        let richMarkdown = item.content;
        
        // 1. Process Images (Base64) for HTML version
        const regex = /!\[([\s\S]*?)\]\((.*?)\)/g;
        const matches = Array.from(richMarkdown.matchAll(regex));
        
        for (const match of matches) {
            const fullMatch = match[0];
            const alt = match[1];
            const src = match[2];
            
            // Only process placeholders
            if (src.includes('ai-image://placeholder')) {
                const prompt = alt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                try {
                    const record = await imageDb.getImageByPrompt(prompt);
                    if (record && record.base64) {
                        richMarkdown = richMarkdown.replace(fullMatch, `![${alt}](${record.base64})`);
                    }
                } catch {
                    void 0;
                }
            }
        }

        // 2. Process Charts -> Images for HTML version
        const chartRegex = /```echarts\n([\s\S]*?)```/g;
        const chartMatches = Array.from(richMarkdown.matchAll(chartRegex));

        for (const match of chartMatches) {
            const fullMatch = match[0];
            const code = match[1];
            try {
                const parsed = dirtyJsonParse(code);
                if (isChartConfig(parsed)) {
                    const base64 = await chartConfigToImage(parsed);
                    richMarkdown = richMarkdown.replace(fullMatch, `![Chart - ${parsed.title || 'Data'}](${base64})`);
                }
            } catch (e) {
                console.error('Failed to convert chart to image for copy:', e);
            }
        }

        // 3. Convert to HTML
        const converter = new showdown.Converter();
        converter.setOption('tables', true);
        converter.setOption('simpleLineBreaks', true);
        converter.setOption('strikethrough', true);
        const htmlContent = converter.makeHtml(richMarkdown);

        // 4. Write to Clipboard (HTML + Plain Text)
        // Plain text: Original content (clean, no base64 junk)
        // HTML: Full content with embedded images (for Word/Docs)
        
        const clipboardItem = new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([item.content], { type: 'text/plain' })
        });

        await navigator.clipboard.write([clipboardItem]);
        showToast('已复制 (支持富文本粘贴)');
    } catch (e) {
        console.error('Copy failed:', e);
        showToast('复制失败', 'error');
    }
  };
  const handleGitHubSync = async (contentToSync: string, currentTopic: string) => {
    if (!settings.githubToken || !settings.githubRepo) {
      alert('请先在“系统配置 - GitHub 配置”中完善 Token 和 仓库名。');
      navigate('/settings');
      return;
    }

    setIsSyncing(true);
    // Standard filename sanitization
    const fileName = `${currentTopic || 'article'}.md`
      .toLowerCase()
      .trim()
      .replace(/[^\u4e00-\u9fa5a-z0-9]/g, '-') // Support Chinese characters in filename
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const path = settings.githubPath ? `${settings.githubPath.replace(/^\/+|\/+$/g, '')}/${fileName}` : fileName;

    try {
      // 1. Try to get file SHA if it exists
      let sha = '';
      const getUrl = `https://api.github.com/repos/${settings.githubRepo}/contents/${path}?ref=${settings.githubBranch}`;
      const getRes = await fetch(getUrl, {
        headers: {
          'Authorization': `token ${settings.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
      }

      // 2. Encode to Base64 (UTF-8 safe)
      const contentBase64 = btoa(encodeURIComponent(contentToSync).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      ));

      // 3. Create or Update file
      const putUrl = `https://api.github.com/repos/${settings.githubRepo}/contents/${path}`;
      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${settings.githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Update article: ${currentTopic}`,
          content: contentBase64,
          branch: settings.githubBranch,
          sha: sha || undefined
        })
      });

      if (putRes.ok) {
        showToast('文章已成功同步至 GitHub', 'success');
      } else {
        const err = await putRes.json();
        throw new Error(err.message || 'Sync failed');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(error);
      alert(`GitHub 同步失败: ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEdit = (item: HistoryItem) => {
      // Navigate to writer with state
      navigate('/writer', { state: { topic: item.topic, content: item.content } });
      showToast('已加载到编辑器');
  };

  const handleExport = async (item: HistoryItem, format: 'md' | 'html' | 'txt') => {
    let content = item.content;
    const filename = `${item.topic || 'article'}.${format}`;
    let mimeType = 'text/plain';

    // 1. Image Processing (Base64 embedding)
    if (format === 'md' || format === 'html') {
      const regex = /!\[([\s\S]*?)\]\((.*?)\)/g;
      const matches = Array.from(content.matchAll(regex));
      
      for (const match of matches) {
        const fullMatch = match[0];
        // const alt = match[1]; // unused
        const alt = match[1];
        const prompt = alt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        try {
          // Attempt to retrieve from IndexedDB
          const record = await imageDb.getImageByPrompt(prompt);
          if (record && record.base64) {
            content = content.replace(fullMatch, `![${prompt}](${record.base64})`);
          } else {
             // Handle missing image
             if (format === 'html') {
                 content = content.replace(fullMatch, `<div style="padding:10px;background:#eee;color:#666;text-align:center;border-radius:4px">[图片未找到: ${prompt}]</div>`);
             }
          }
        } catch (e) {
          console.error('Export image processing failed:', e);
        }
      }
    }

    // 2. Format Construction
    let finalData = content;
    if (format === 'html') {
      mimeType = 'text/html';
      
      // Extract ECharts configs
      const chartConfigs: { id: string, option: unknown }[] = [];
      let chartIndex = 0;
      
      // Temporary placeholder for processing
      let htmlBody = content
        .replace(/```echarts\n([\s\S]*?)```/g, (_match, code) => {
             const id = `echarts-export-${chartIndex++}`;
             try {
                 // Clean and parse JSON using shared utility
                 const parsed = dirtyJsonParse(code);
                 if (isChartConfig(parsed)) {
                     const option = generateEChartsOption(parsed);
                     chartConfigs.push({ id, option });
                     return `<div id="${id}" class="echarts-container" style="width:100%;height:400px;margin:30px 0;background:#fff;border-radius:12px;border:1px solid #e2e8f0;"></div>`;
                 }
                 return `<pre class="code-block">${code}</pre>`;
             } catch {
                 return `<pre class="code-block">${code}</pre>`;
             }
        });

      // Simple Markdown to HTML conversion
      htmlBody = htmlBody
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
        .replace(/\n\n/g, '<p></p>')
        .replace(/\n/g, '<br>');

      // Generate Chart Init Script
      const chartScript = chartConfigs.length > 0 ? `
        <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
        <script>
          window.onload = function() {
            const charts = ${JSON.stringify(chartConfigs)};
            
            charts.forEach(item => {
               const dom = document.getElementById(item.id);
               if(!dom) return;
               
               const myChart = echarts.init(dom);
               // Use pre-calculated option from consistent logic
               myChart.setOption(item.option);
            });
          }
        </script>
      ` : '';

      finalData = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${item.topic}</title>
<style>
body { font-family: 'Inter', sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #1e293b; background: #f9fafb; }
h1 { border-bottom: 3px solid #22d3ee; padding-bottom: 12px; color: #0f172a; font-size: 2.2rem; }
h2 { color: #4f46e5; margin-top: 40px; border-left: 4px solid #4f46e5; padding-left: 15px; }
h3 { color: #0f172a; margin-top: 30px; }
p { margin-bottom: 20px; font-size: 1.1rem; }
img { max-width: 100%; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
blockquote { border-left: 4px solid #cbd5e1; padding-left: 16px; color: #475569; margin: 20px 0; }
.code-block { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: monospace; }
</style>
</head>
<body>
${htmlBody}
${chartScript}
</body>
</html>`;
    } else if (format === 'md') {
      mimeType = 'text/markdown';
      finalData = content;
    }

    // 3. Trigger Download
    const blob = new Blob([finalData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`已导出为 ${format.toUpperCase()}`);
  };

  type MarkdownImgProps = React.ImgHTMLAttributes<HTMLImageElement> & { src?: string; alt?: string };
  type MarkdownCodeProps = React.HTMLAttributes<HTMLElement> & { inline?: boolean; className?: string; children?: React.ReactNode };

  const markdownComponents = useMemo(() => ({
    img: ({ src, alt, ...props }: MarkdownImgProps) => {
      if (!src) return null;
      // Clean alt just like in Writer
      const prompt = (alt || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (previewImages[prompt]) {
        return <img src={previewImages[prompt]} alt={alt} {...props} style={{ maxWidth: '100%', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }} />;
      }
      
      // If image is not generated yet or not found in DB
      if (src.includes('ai-image://placeholder')) {
         return (
            <div style={{ padding: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.2)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <ImageIcon size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ fontStyle: 'italic' }}>图片未生成或已丢失: "{prompt}"</p>
            </div>
         );
      }
      
      return <img src={src} alt={alt} {...props} style={{ maxWidth: '100%', borderRadius: '12px' }} />;
    },
    code({ inline, className, children, ...props }: MarkdownCodeProps) {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match && match[1] === 'echarts') {
        return <ChartBlock config={String(children).replace(/\n$/, '')} />;
      }
      return <code className={className} {...props}>{children}</code>;
    }
  }), [previewImages]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <header style={{ marginBottom: '8px' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.4rem', margin: 0 }}>
          Article Archive
        </h1>
      </header>

      {history.map(item => (
        <GlassCard key={item.id} variant="panel" noPadding style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.topic}</h4>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>
              {item.date}
            </span>
          </div>

          <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', position: 'relative' }}>
            <div style={{ maxHeight: '120px', overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent)' }}>
              {item.content}
            </div>
          </div>

          <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.1)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() => setPreviewItem(item)}
              icon={<Eye size={14} />}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              阅读全文
            </Button>

            <Button
              variant="primary"
              onClick={() => handleEdit(item)}
              icon={<PenTool size={14} />}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              继续编辑
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleGitHubSync(item.content, item.topic)}
              disabled={isSyncing}
              icon={<Github size={14} />}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              同步
            </Button>

            <div style={{ position: 'relative' }}>
              <Button
                variant="secondary"
                onClick={() => setExportMenuOpenId(exportMenuOpenId === item.id ? null : item.id)}
                icon={<Download size={14} />}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                导出
              </Button>
              {exportMenuOpenId === item.id && (
                <>
                  <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 5 }} 
                    onClick={() => setExportMenuOpenId(null)} 
                  />
                  <div className="history-export-menu">
                    {(['md', 'html', 'txt'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => {
                          handleExport(item, fmt);
                          setExportMenuOpenId(null);
                        }}
                        style={{
                          padding: '12px 16px', background: 'transparent', border: 'none',
                          color: '#f8fafc', textAlign: 'left', cursor: 'pointer',
                          fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px',
                          borderBottom: fmt !== 'txt' ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.75rem', width: '36px' }}>{fmt}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                           {fmt === 'md' ? 'Markdown' : fmt === 'html' ? 'Web Page' : 'Text'}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              onClick={() => handleCopy(item)}
              icon={<Copy size={14} />}
              style={{ padding: '8px 16px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              复制
            </Button>

            <div style={{ flex: 1 }} />

            <Button
              variant="danger"
              onClick={() => {
                if (confirm('确定要删除这篇文章吗？')) {
                  deleteFromHistory(item.id);
                  showToast('文章已删除');
                }
              }}
              icon={<Trash2 size={14} />}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            />
          </div>
        </GlassCard>
      ))}

      {history.length > 0 && (
        <Button
          variant="danger"
          onClick={() => {
            if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
              clearHistory();
            }
          }}
          icon={<Trash2 size={16} />}
          style={{
            background: 'transparent',
            width: 'fit-content',
            alignSelf: 'center',
            marginTop: '12px'
          }}
        >
          清空所有记录
        </Button>
      )}

      {history.length === 0 && (
        <div className="empty-state" style={{ height: '400px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <HistoryIcon size={64} className="empty-state-icon" style={{ opacity: 0.3, color: 'var(--text-secondary)' }} />
          <h3 style={{ fontSize: '1.5rem', marginTop: '24px', color: 'var(--text-primary)' }}>暂无历史记录</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: '1.6' }}>
            您生成的文章会自动保存在这里，方便随时回顾和管理。<br />
            去 AI Writer 开始您的第一篇创作吧！
          </p>
          <Button 
            style={{ marginTop: '32px', padding: '12px 32px' }} 
            onClick={() => navigate('/writer')}
            icon={<Sparkles size={18} />}
          >
            开始创作
          </Button>
        </div>
      )}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="history-preview-overlay"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="history-preview-modal"
            >
              <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{previewItem.topic}</h2>
                <button onClick={() => setPreviewItem(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>
              
              <div className="history-preview-body custom-scrollbar markdown-content paper-style" style={{ overflowY: 'auto', flex: 1 }}>
                <ReactMarkdown 
                  components={markdownComponents}
                  urlTransform={(url) => url}
                >
                   {previewItem.content
                     .replace(/!\[([\s\S]*?)\]\((.*?)\)/g, (_match, alt, src) => {
                        const cleanAlt = alt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                        return `![${cleanAlt}](${src})`;
                     })
                     .replace(/\*\*\s+(.*?)\s+\*\*/g, '**$1**')
                     .replace(/\*\*\s*\*\*/g, '')
                   }
                </ReactMarkdown>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default History;
