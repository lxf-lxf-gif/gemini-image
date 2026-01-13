import { useState, useEffect } from 'react';
import { Sparkles, PenTool, Settings, History, Loader2, Layout, CheckCircle, Copy, Trash2, ExternalLink, Download, Github, Eye, List, Link, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from './services/aiService';
import ReactMarkdown from 'react-markdown';
import ChartBlock from './components/ChartBlock';
import TOC from './components/TOC';
import './App.css';

function App() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('Professional');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [isManualModel, setIsManualModel] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [wordCount, setWordCount] = useState(1200);
  const [language, setLanguage] = useState('Chinese');
  const [perspective, setPerspective] = useState('Second Person (You)');
  const [intent, setIntent] = useState('Informational');
  const [enableThinking, setEnableThinking] = useState(false);
  const [enableImages, setEnableImages] = useState(false);
  const [anchorTexts, setAnchorTexts] = useState<{ keyword: string, url: string }[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMode, setGenMode] = useState<'full' | 'continue' | null>(null);
  const [activeTab, setActiveTab] = useState('writer');
  const [history, setHistory] = useState<{ id: string, topic: string, date: string, content: string }[]>([]);
  const [showConfig, setShowConfig] = useState(true);
  const [showTOC, setShowTOC] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  // GitHub Config
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubPath, setGithubPath] = useState('articles');
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load persistence
  useEffect(() => {
    const savedApiKey = localStorage.getItem('seo_api_key');
    const savedEndpoint = localStorage.getItem('seo_endpoint');
    const savedHistory = localStorage.getItem('seo_history');
    const savedGhToken = localStorage.getItem('seo_gh_token');
    const savedGhRepo = localStorage.getItem('seo_gh_repo');
    const savedGhBranch = localStorage.getItem('seo_gh_branch');
    const savedGhPath = localStorage.getItem('seo_gh_path');

    // Persistence for other settings
    const savedModel = localStorage.getItem('seo_model');
    const savedLang = localStorage.getItem('seo_language');
    const savedTone = localStorage.getItem('seo_tone');
    const savedWC = localStorage.getItem('seo_word_count');
    const savedPersp = localStorage.getItem('seo_perspective');
    const savedIntent = localStorage.getItem('seo_intent');
    const savedThinking = localStorage.getItem('seo_enable_thinking');
    const savedImages = localStorage.getItem('seo_enable_images');

    if (savedApiKey) setApiKey(savedApiKey);
    if (savedEndpoint) setEndpoint(savedEndpoint);
    if (savedGhToken) setGithubToken(savedGhToken);
    if (savedGhRepo) setGithubRepo(savedGhRepo);
    if (savedGhBranch) setGithubBranch(savedGhBranch);
    if (savedGhPath) setGithubPath(savedGhPath);

    if (savedModel) setModel(savedModel);
    if (savedLang) setLanguage(savedLang);
    if (savedTone) setTone(savedTone);
    if (savedWC) setWordCount(Number(savedWC));
    if (savedPersp) setPerspective(savedPersp);
    if (savedIntent) setIntent(savedIntent);
    if (savedThinking) setEnableThinking(savedThinking === 'true');
    if (savedImages) setEnableImages(savedImages === 'true');

    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('seo_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('seo_endpoint', endpoint);
  }, [endpoint]);

  useEffect(() => {
    localStorage.setItem('seo_model', model);
    localStorage.setItem('seo_language', language);
    localStorage.setItem('seo_tone', tone);
    localStorage.setItem('seo_word_count', String(wordCount));
    localStorage.setItem('seo_perspective', perspective);
    localStorage.setItem('seo_intent', intent);
    localStorage.setItem('seo_enable_thinking', String(enableThinking));
    localStorage.setItem('seo_enable_images', String(enableImages));
  }, [model, language, tone, wordCount, perspective, intent, enableThinking, enableImages]);

  useEffect(() => {
    localStorage.setItem('seo_gh_token', githubToken);
  }, [githubToken]);

  useEffect(() => {
    localStorage.setItem('seo_gh_repo', githubRepo);
  }, [githubRepo]);

  useEffect(() => {
    localStorage.setItem('seo_gh_branch', githubBranch);
  }, [githubBranch]);

  useEffect(() => {
    localStorage.setItem('seo_gh_path', githubPath);
  }, [githubPath]);

  useEffect(() => {
    localStorage.setItem('seo_history', JSON.stringify(history));
  }, [history]);

  const clearHistory = () => {
    if (window.confirm('确定要清除所有生成记录吗？此操作不可撤销。')) {
      setHistory([]);
      showToast('历史记录已清空');
    }
  };

  const saveToHistory = (content: string, isUpdate: boolean = false) => {
    const newItem = {
      id: isUpdate && history.length > 0 ? history[0].id : Date.now().toString(),
      topic: topic || "未命名主题",
      date: new Date().toLocaleString(),
      content
    };

    let newHistory;
    if (isUpdate && history.length > 0) {
      newHistory = [newItem, ...history.slice(1)];
    } else {
      newHistory = [newItem, ...history].slice(0, 50);
    }
    setHistory(newHistory);
  };

  const handleGenerate = async () => {
    if (!topic || !apiKey) {
      alert('Please enter topic and API key');
      return;
    }

    setIsGenerating(true);
    setGenMode('full');
    setResult('');

    const activeModel = model;

    try {
      aiService.initGemini(apiKey, activeModel, endpoint);

      const kwList = keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);

      let fullContent = '';
      await aiService.generateSEOContentStream(
        activeModel,
        topic,
        kwList,
        tone,
        perspective,
        intent,
        wordCount,
        language,
        enableThinking,
        enableImages,
        anchorTexts,
        (chunk: string) => {
          fullContent += chunk;
          setResult(fullContent);
        }
      );
      if (fullContent) {
        saveToHistory(fullContent);
        showToast('内容生成成功并已保存');
      }
    } catch (error: any) {
      let errorMsg = error.message;
      if (errorMsg.includes('User location is not supported')) {
        errorMsg = '❌ 访问受限：Gemini API 不支持您当前的地区。请尝试开启全局代理（如美国/日本节点）或切换到 OpenAI 提供的模型。';
      } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        errorMsg = `❌ 模型 ID 未找到 (404 Error)：\n\n当前的模型 ID "${activeModel}" 在您的 API 权限中暂未启用或尚未在该区域上线。\n\n💡 **建议解决方法：**\n1. 尝试选择带有 **"-preview"** 后缀的版本。\n2. 切换回 **"gemini-2.5-flash"** (目前最稳定的主力版)。\n3. 确认您的 API Key 权属于官方指定的可用区。`;
      }
      setResult(`错误信息：\n\n${errorMsg}`);
    } finally {
      setIsGenerating(false);
      setGenMode(null);
    }
  };

  const handleContinue = async () => {
    if (!result || !apiKey) return;

    setIsGenerating(true);
    setGenMode('continue');

    try {
      const activeModel = model;
      aiService.initGemini(apiKey, activeModel, endpoint);

      let fullContent = result + '\n\n';
      await aiService.generateContinuationStream(
        activeModel,
        result,
        language,
        enableThinking,
        anchorTexts,
        (chunk: string) => {
          fullContent += chunk;
          setResult(fullContent);
        }
      );
      if (fullContent) {
        // Update the most recent history item if it exists and matches the current topic
        saveToHistory(fullContent, true);
      }
    } catch (error: any) {
      alert(`续写失败: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setGenMode(null);
    }
  };

  const handleExport = (format: 'md' | 'html' | 'txt') => {
    let content = result;
    let filename = `${topic || 'article'}.${format}`;
    let mimeType = 'text/plain';

    if (format === 'html') {
      content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${topic}</title>
  <style>
    body { font-family: 'Inter', sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #1e293b; background: #f9fafb; }
    h1 { border-bottom: 3px solid #22d3ee; padding-bottom: 12px; color: #0f172a; font-size: 2.2rem; }
    h2 { color: #4f46e5; margin-top: 40px; border-left: 4px solid #4f46e5; padding-left: 15px; }
    h3 { color: #0f172a; margin-top: 30px; }
    p { margin-bottom: 20px; font-size: 1.1rem; }
    ul, ol { margin-bottom: 20px; }
    li { margin-bottom: 10px; }
    code { background: #f1f5f9; padding: 2px 6px; borderRadius: 4px; font-family: monospace; }
    .chart-placeholder { background: #f1f5f9; border: 1px dashed #cbd5e1; padding: 20px; text-align: center; color: #64748b; margin: 20px 0; border-radius: 8px; }
    .toc-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 40px; }
    .toc-block h4 { margin: 0 0 15px 0; color: #0f172a; border: none; padding: 0; }
    .toc-block ul { list-style: none; padding: 0; margin: 0; }
    .toc-block li { margin-bottom: 8px; }
    .toc-block li.level-2 { padding-left: 20px; }
    .toc-block li.level-3 { padding-left: 40px; }
    .toc-block a { color: #4f46e5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="toc-block">
    <h4>📍 目录导航</h4>
    <ul>
      ${result.split('\n')
          .filter(line => /^###?\s/.test(line))
          .map(line => {
            const level = line.match(/^#+/)?.[0].length || 1;
            const text = line.replace(/^#+\s/, '').trim();
            const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
            return `<li class="level-${level}"><a href="#${id}">${text}</a></li>`;
          }).join('')
        }
    </ul>
  </div>
  ${result
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/^## (.*$)/gm, (_, t) => `<h2 id="${t.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}">${t}</h2>`)
          .replace(/^### (.*$)/gm, (_, t) => `<h3 id="${t.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}">${t}</h3>`)
          .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/```echarts[\s\S]*?```/g, '<div class="chart-placeholder">[ 交互式图表已在网页版记录 ]</div>')
          .replace(/\n\n/g, '<p></p>')
          .replace(/\n/g, '<br>')
        }
</body>
</html>`;
      mimeType = 'text/html';
    } else if (format === 'md') {
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    showToast(`已导出为 ${format.toUpperCase()}`);
  };

  const handleFullScreenPreview = () => {
    if (!result) return;

    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      alert('请允许浏览器弹出窗口以开启预览。');
      return;
    }

    // Helper to safely prepare chart configs for the preview window script
    const prepareChartConfig = (config: string) => {
      try {
        const cleaned = config.replace(/```(json|echarts)?/g, '').replace(/```/g, '').trim();
        return btoa(encodeURIComponent(cleaned));
      } catch (e) { return ''; }
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>内容预览: ${topic || '未命名主题'}</title>
        <script src="https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
          :root {
            --text-main: #1e293b;
            --text-content: #334155;
            --bg-paper: #ffffff;
            --accent: #4f46e5;
          }
          body {
            margin: 0;
            padding: 0;
            background: #f1f5f9;
            font-family: 'Inter', -apple-system, "Microsoft YaHei", sans-serif;
            color: var(--text-main);
            display: flex;
            justify-content: center;
          }
          .container {
            background: var(--bg-paper);
            width: 100%;
            max-width: 900px;
            min-height: 100vh;
            padding: 80px 100px;
            box-sizing: border-box;
            box-shadow: 0 0 50px rgba(0,0,0,0.05);
          }
          .content {
            line-height: 1.8;
            font-size: 1.15rem;
            color: var(--text-content);
          }
          h1 { font-size: 2.8rem; margin-bottom: 40px; color: #0f172a; border-bottom: 4px solid var(--accent); padding-bottom: 12px; }
          h2 { font-size: 1.8rem; margin-top: 50px; color: var(--accent); border-left: 5px solid var(--accent); padding-left: 20px; }
          h3 { font-size: 1.4rem; margin-top: 30px; color: #0f172a; }
          p { margin-bottom: 24px; }
          strong { color: #0f172a; }
          blockquote { border-left: 4px solid #e2e8f0; padding-left: 20px; color: #64748b; font-style: italic; margin: 30px 0; }
          img { max-width: 100%; border-radius: 12px; }
          .echart-container {
            width: 100%;
            height: 420px;
            margin: 40px 0;
            padding: 24px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 4px 20px -5px rgba(0,0,0,0.05);
            box-sizing: border-box;
          }
          .toc-container {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 60px;
          }
          .toc-title {
            font-weight: 700;
            font-size: 1.2rem;
            margin-bottom: 20px;
            color: #0f172a;
          }
          .toc-list { list-style: none; padding: 0; margin: 0; }
          .toc-item { margin-bottom: 12px; }
          .toc-item a { color: var(--text-content); text-decoration: none; transition: color 0.2s; }
          .toc-item a:hover { color: var(--accent); }
          .toc-item.level-2 { padding-left: 20px; }
          .toc-item.level-3 { padding-left: 40px; font-size: 0.95rem; opacity: 0.8; }
          @media (max-width: 768px) {
            .container { padding: 40px 24px; }
            h1 { font-size: 2rem; }
            .echart-container { height: 300px; padding: 12px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>${topic || '博文预览'}</h1>
          </header>

          <div class="toc-container">
            <div class="toc-title">📍 内容目录</div>
            <ul class="toc-list">
              ${result.split('\n')
        .filter(line => /^###?\s/.test(line))
        .map(line => {
          const level = line.match(/^#+/)?.[0].length || 1;
          const text = line.replace(/^#+\s/, '').trim();
          const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
          return `<li class="toc-item level-${level}"><a href="#${id}">${text}</a></li>`;
        }).join('')
      }
            </ul>
          </div>

          <div class="content" id="article-content">
            ${result
        .replace(/^# (.*$)/gm, '')
        .replace(/^## (.*$)/gm, (_, t) => `<h2 id="${t.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}">${t}</h2>`)
        .replace(/^### (.*$)/gm, (_, t) => `<h3 id="${t.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}">${t}</h3>`)
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```echarts([\s\S]*?)```/g, (_, config) => {
          return `<div class="echart-container" data-config="${prepareChartConfig(config)}"></div>`;
        })
        .split('\n\n').map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '').join('')
      }
          </div>
        </div>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            const renderCharts = () => {
              const containers = document.querySelectorAll('.echart-container');
              containers.forEach(container => {
                try {
                  const configStr = decodeURIComponent(atob(container.getAttribute('data-config')));
                  const parsed = JSON.parse(configStr);
                  const myChart = echarts.init(container);

                  const option = {
                    title: { text: parsed.title || '数据对比', left: 'center', textStyle: { color: '#0f172a', fontSize: 16, fontWeight: 600 } },
                    tooltip: { trigger: parsed.type === 'pie' ? 'item' : 'axis', backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                    legend: { bottom: '0%', textStyle: { color: '#334155' } },
                    grid: { left: '5%', right: '5%', bottom: '20%', containLabel: true },
                    xAxis: parsed.type !== 'pie' ? {
                      type: 'category',
                      data: (parsed.data || []).map(item => item.name),
                      axisLabel: { color: '#475569' }
                    } : undefined,
                    yAxis: parsed.type !== 'pie' ? { type: 'value', axisLabel: { color: '#475569' }, splitLine: { lineStyle: { color: '#f1f5f9' } } } : undefined,
                    series: [{
                      name: parsed.title || '数值',
                      type: parsed.type || 'bar',
                      radius: parsed.type === 'pie' ? ['40%', '70%'] : undefined,
                      data: parsed.type === 'pie' ? (parsed.data || []) : (parsed.data || []).map(item => item.value),
                      itemStyle: { borderRadius: parsed.type === 'bar' ? 6 : 0, color: parsed.type === 'bar' ? '#0ea5e9' : undefined }
                    }],
                    color: ['#0ea5e9', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b']
                  };

                  myChart.setOption(option);
                } catch (e) {
                  console.error('Failed to render chart:', e);
                  container.innerHTML = '<p style="color: #dc2626; text-align: center; padding-top: 100px;">⚠️ 该图表数据格式错误，无法渲染。</p>';
                }
              });
            };
            if (window.echarts) {
              renderCharts();
            } else {
              window.onload = renderCharts;
            }
          });
        </script>
      </body>
      </html>
    `;

    previewWindow.document.write(htmlContent);
    previewWindow.document.close();
  };

  const handleGitHubSync = async (contentToSync: string, currentTopic: string) => {
    if (!githubToken || !githubRepo) {
      alert('请先在“系统配置 - GitHub 配置”中完善 Token 和 仓库名。');
      setActiveTab('settings');
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

    const path = githubPath ? `${githubPath.replace(/^\/+|\/+$/g, '')}/${fileName}` : fileName;

    try {
      // 1. Try to get file SHA if it exists
      let sha = '';
      const getUrl = `https://api.github.com/repos/${githubRepo}/contents/${path}?ref=${githubBranch}`;
      const getRes = await fetch(getUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
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
      const putUrl = `https://api.github.com/repos/${githubRepo}/contents/${path}`;
      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Update article: ${currentTopic}`,
          content: contentBase64,
          branch: githubBranch,
          sha: sha || undefined
        })
      });

      if (putRes.ok) {
        showToast('文章已成功同步至 GitHub', 'success');
      } else {
        const err = await putRes.json();
        throw new Error(err.message || 'Sync failed');
      }
    } catch (error: any) {
      console.error(error);
      alert(`GitHub 同步失败: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo text-gradient" style={{ padding: '0 12px' }}>
          <Sparkles size={28} />
          <span style={{ fontSize: '1.4rem' }}>SEO Writer</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            className={`glass-card nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('dashboard')}
          >
            <Layout size={20} color={activeTab === 'dashboard' ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
            <span style={{ fontWeight: 500, color: activeTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Dashboard</span>
          </div>

          <div
            className={`glass-card nav-item ${activeTab === 'writer' ? 'active' : ''}`}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('writer')}
          >
            <PenTool size={20} color={activeTab === 'writer' ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
            <span style={{ fontWeight: 500, color: activeTab === 'writer' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>AI Writer</span>
          </div>

          <div
            className={`glass-card nav-item ${activeTab === 'history' ? 'active' : ''}`}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('history')}
          >
            <History size={20} color={activeTab === 'history' ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
            <span style={{ fontWeight: 500, color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>History</span>
          </div>

          <div
            className={`glass-card nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} color={activeTab === 'settings' ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
            <span style={{ fontWeight: 500, color: activeTab === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Settings</span>
          </div>
        </nav>

        <div className="glass-card" style={{ marginTop: 'auto', padding: '16px', fontSize: '0.85rem' }}>
          <ul style={{ paddingLeft: '16px', margin: 0, color: 'var(--text-secondary)' }}>
            <li>短博文: 300-600字</li>
            <li>标准文章: 800-1200字</li>
            <li>深度指南: 1500字+</li>
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 className="text-gradient" style={{ fontSize: '2.4rem', margin: 0 }}>
            {activeTab === 'writer' && 'SEO Command Center'}
            {activeTab === 'dashboard' && 'Control Dashboard'}
            {activeTab === 'history' && 'Article Archive'}
            {activeTab === 'settings' && 'System Config'}
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {activeTab === 'writer' && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="primary-btn"
                style={{
                  background: showConfig ? 'var(--accent-purple)' : 'rgba(255,255,255,0.05)',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                  boxShadow: 'none',
                  border: '1px solid ' + (showConfig ? 'var(--accent-purple-dim)' : 'rgba(255,255,255,0.1)')
                }}
              >
                <Settings size={16} /> 创作设置 {showConfig ? '已开启' : '已隐藏'}
              </button>
            )}
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '120px' }}>
              <option value="Chinese">🇨🇳 中文</option>
              <option value="English">🇺🇸 English</option>
              <option value="Spanish">🇪🇸 Español</option>
              <option value="French">🇫🇷 Français</option>
              <option value="Arabic">🇸🇦 العربية</option>
              <option value="Hindi">🇮🇳 हिन्दी</option>
            </select>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="view-fade"
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>累计生成文章</div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--accent-cyan)', lineHeight: 1 }}>{history.length}</div>
                </div>
                <div className="glass-card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>累计创作字数</div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--accent-purple)', lineHeight: 1 }}>
                    {(history.reduce((acc, item) => acc + item.content.length, 0) / 1000).toFixed(1)}k
                  </div>
                </div>
                <div className="glass-card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>生成效率评级</div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--accent-indigo)', lineHeight: 1 }}>A+</div>
                </div>
                <div className="glass-card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>当前 AI 模型</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
                    {model.replace('gemini-', '').replace('-flash', '').toUpperCase()}
                  </div>
                </div>
              </div>

              <section className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>字数里程碑 (Word Count Goal)</h3>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '14px', borderRadius: '7px', overflow: 'hidden', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (history.reduce((acc, item) => acc + item.content.length, 0) / 10000) * 100)}%` }}
                    style={{ background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))', height: '100%', borderRadius: '7px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontFamily: 'monospace' }}>{history.reduce((acc, item) => acc + item.content.length, 0).toLocaleString()} / 10,000</span>
                  <span>大师级写作者勋章</span>
                </div>
              </section>

              <section className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>最近活动 (Recent Activity)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {history.slice(0, 5).map(item => (
                    <div key={item.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500 }}>
                        <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-cyan)' }}>
                          <PenTool size={16} />
                        </div>
                        {item.topic}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{item.date}</span>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="empty-state">
                      <Sparkles size={40} className="empty-state-icon" style={{ opacity: 0.5, marginBottom: '16px' }} />
                      <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>准备好开始了吗？</h4>
                      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>点击侧边栏的 AI Writer 开启您的创作之旅。</p>
                      <button className="primary-btn" style={{ marginTop: '24px', padding: '10px 24px' }} onClick={() => setActiveTab('writer')}>
                        <PenTool size={16} style={{ marginRight: '8px' }} /> 立即创作
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="view-fade"
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              {history.map(item => (
                <div key={item.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
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
                    <button
                      className="primary-btn"
                      onClick={() => {
                        setTopic(item.topic);
                        setResult(item.content);
                        setActiveTab('writer');
                        showToast('已加载到编辑器');
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'var(--accent-purple)', color: 'white', border: 'none' }}
                    >
                      <PenTool size={14} style={{ marginRight: '6px' }} /> 继续编辑
                    </button>

                    <button
                      className="primary-btn"
                      onClick={() => handleGitHubSync(item.content, item.topic)}
                      disabled={isSyncing}
                      style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <Github size={14} style={{ marginRight: '6px' }} /> 同步
                    </button>

                    <button
                      className="primary-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(item.content);
                        showToast('已复制到剪贴板');
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <Copy size={14} style={{ marginRight: '6px' }} /> 复制
                    </button>

                    <div style={{ flex: 1 }} />

                    <button
                      className="primary-btn"
                      onClick={() => {
                        // Use a temporary state or confirm dialog in a real app, here direct delete for simplicity but styled as danger
                        if (confirm('确定要删除这篇文章吗？')) {
                          setHistory(history.filter(h => h.id !== item.id));
                          showToast('文章已删除');
                        }
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    >
                      <Trash2 size={14} style={{ marginRight: '6px' }} />
                    </button>
                  </div>
                </div>
              ))}

              {history.length > 0 && (
                <button
                  className="primary-btn"
                  onClick={() => {
                    if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
                      clearHistory();
                    }
                  }}
                  style={{
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    marginTop: '12px',
                    width: 'fit-content',
                    alignSelf: 'center',
                    padding: '10px 24px'
                  }}
                >
                  <Trash2 size={16} style={{ marginRight: '8px' }} /> 清空所有记录
                </button>
              )}

              {history.length === 0 && (
                <div className="empty-state" style={{ height: '400px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <History size={64} className="empty-state-icon" style={{ opacity: 0.3, color: 'var(--text-secondary)' }} />
                  <h3 style={{ fontSize: '1.5rem', marginTop: '24px', color: 'var(--text-primary)' }}>暂无历史记录</h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: '1.6' }}>
                    您生成的文章会自动保存在这里，方便随时回顾和管理。<br />
                    去 AI Writer 开始您的第一篇创作吧！
                  </p>
                  <button className="primary-btn" style={{ marginTop: '32px', padding: '12px 32px', fontSize: '1rem', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))', border: 'none' }} onClick={() => setActiveTab('writer')}>
                    <Sparkles size={18} style={{ marginRight: '8px' }} /> 开始创作
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="view-fade"
              style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}
            >
              <section className="glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                  <Sparkles size={20} /> AI 模型配置 (API Settings)
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="config-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="config-label">Gemini 模型版本</span>
                      <button
                        onClick={() => setIsManualModel(!isManualModel)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.8 }}
                      >
                        {isManualModel ? '切换至列表选择' : '切换至手动输入 ID'}
                      </button>
                    </div>
                    {isManualModel ? (
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="例如: gemini-3-flash"
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <select value={model} onChange={(e) => setModel(e.target.value)} style={{ width: '100%' }}>
                        <optgroup label="文本输出 (Text Output)">
                          <option value="gemini-3-flash">Gemini 3 Flash (最新 GA版)</option>
                          <option value="gemini-2.5-flash">Gemini 2.5 Flash (稳定版)</option>
                          <option value="gemini-2.5-pro">Gemini 2.5 Pro (推理增强)</option>
                        </optgroup>
                        <optgroup label="其他 (Others)">
                          <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                        </optgroup>
                      </select>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="config-group">
                      <span className="config-label" style={{ marginBottom: '12px', display: 'block' }}>API Key</span>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="config-group">
                      <span className="config-label" style={{ marginBottom: '12px', display: 'block' }}>自定义代理 (Optional)</span>
                      <input
                        type="text"
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        placeholder="https://api.vectorengine.ai"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                  <Github size={20} /> GitHub 同步配置
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="config-group">
                      <span className="config-label" style={{ marginBottom: '12px', display: 'block' }}>仓库路径 (User/Repo)</span>
                      <input
                        type="text"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                        placeholder="deepmind/seo-articles"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="config-group">
                      <span className="config-label" style={{ marginBottom: '12px', display: 'block' }}>目标分支 (Branch)</span>
                      <input
                        type="text"
                        value={githubBranch}
                        onChange={(e) => setGithubBranch(e.target.value)}
                        placeholder="main"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="config-group">
                    <span className="config-label" style={{ marginBottom: '12px', display: 'block' }}>GitHub 访问令牌 (PAT)</span>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxx"
                      style={{ width: '100%' }}
                    />
                    <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-purple)' }}></div>
                      需要具备 'repo' 或 'contents' 写入权限。Token 仅加密存储在本地。
                    </div>
                  </div>

                  <div className="config-group">
                    <span className="config-label" style={{ marginBottom: '12px', display: 'block' }}>存储目录 (Path)</span>
                    <input
                      type="text"
                      value={githubPath}
                      onChange={(e) => setGithubPath(e.target.value)}
                      placeholder="blog/posts"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </section>

              <section className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem' }}>关于 SEO Writer</h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.8', maxWidth: '600px', margin: '0 auto' }}>
                  专为专业内容创作者设计的 SEO 优化写作工具。<br />
                  集成了 Gemini Pro 1.5/3.0 的强大推理能力，支持智能锚文本植入、多语言 SEO 优化及 GitHub 内容流同步。
                </div>
                <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Version 2.0.0 (Pro) &bull; Built with React & Google Gemini
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'writer' && (
            <motion.div
              key="writer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="view-fade writer-grid"
              style={{
                gridTemplateColumns: showConfig ? '1fr 350px' : '1fr 0px',
                transition: 'grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Left Column: Writing Workspace */}
              <div className="no-scrollbar writer-workspace" style={{
                overflowY: 'auto',
                height: '100%',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '40px'
              }}>
                {result ? (
                  <div style={{ maxWidth: '750px', margin: '0 auto', position: 'relative' }}>
                    <div style={{
                      position: 'sticky',
                      top: '-20px',
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '28px',
                      background: 'var(--bg-glass)',
                      backdropFilter: 'blur(16px)',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-highlight)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                    }}>
                      {/* Left: Stats */}
                      <div style={{
                        fontSize: '0.8rem', color: 'var(--accent-cyan)', padding: '6px 14px',
                        background: 'var(--accent-cyan-dim)', borderRadius: '10px',
                        border: '1px solid var(--accent-cyan-dim)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600
                      }}>
                        <CheckCircle size={14} /> {result.length} 字符
                      </div>

                      {/* Right: Actions Group */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                        {/* 续写按钮 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <button
                            className="primary-btn"
                            onClick={handleContinue}
                            disabled={isGenerating || !result}
                            style={{
                              padding: '0 16px', fontSize: '0.8rem', height: '36px', borderRadius: '8px',
                              background: result ? 'linear-gradient(135deg, var(--accent-purple), #6366f1)' : '#334155',
                              boxShadow: result ? '0 4px 12px rgba(129, 140, 248, 0.3)' : 'none',
                              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                          >
                            {isGenerating && genMode === 'continue' ? <Loader2 size={14} className="animate-spin" /> : <PenTool size={14} />}
                            {isGenerating && genMode === 'continue' ? '续写中...' : '续写文章'}
                          </button>
                        </div>

                        {/* 工具组 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px' }}>
                          <button
                            className="primary-btn"
                            onClick={() => setShowTOC(!showTOC)}
                            style={{
                              width: '36px', height: '36px', borderRadius: '8px', padding: 0, justifyContent: 'center',
                              background: showTOC ? 'var(--accent-cyan-dim)' : 'transparent',
                              border: showTOC ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                              color: showTOC ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                              display: 'flex', alignItems: 'center'
                            }}
                          >
                            <List size={18} />
                          </button>

                          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />

                          <button
                            className="primary-btn"
                            onClick={() => {
                              navigator.clipboard.writeText(result);
                              showToast('内容已复制');
                            }}
                            style={{
                              padding: '0 12px', fontSize: '0.75rem', height: '36px', borderRadius: '8px',
                              background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                              display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <Copy size={13} /> 复制
                          </button>

                          <button
                            className="primary-btn"
                            onClick={handleFullScreenPreview}
                            disabled={!result || isGenerating}
                            style={{
                              padding: '0 12px', fontSize: '0.75rem', height: '36px', borderRadius: '8px',
                              background: 'rgba(34, 211, 238, 0.08)', border: '1px solid var(--accent-cyan-dim)', color: 'var(--accent-cyan)',
                              display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <Eye size={13} /> 预览
                          </button>

                          <button
                            className="primary-btn"
                            onClick={() => handleGitHubSync(result, topic)}
                            disabled={isSyncing || isGenerating}
                            style={{
                              padding: '0 12px', fontSize: '0.75rem', height: '36px', borderRadius: '8px',
                              background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                              display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <Github size={13} /> {isSyncing ? '同步中...' : '同步GitHub'}
                          </button>
                        </div>

                        {/* 导出菜单 */}
                        <div style={{ position: 'relative' }}>
                          <button
                            className="primary-btn"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            style={{
                              padding: '0 14px', fontSize: '0.8rem', height: '36px', borderRadius: '8px',
                              background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-highlight)', color: 'var(--text-primary)',
                              display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                          >
                            <Download size={14} /> 导出
                          </button>
                          <AnimatePresence>
                            {showExportMenu && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                style={{
                                  position: 'absolute', top: '100%', right: 0, marginTop: '12px',
                                  background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
                                  border: '1px solid var(--border-highlight)', borderRadius: '12px',
                                  padding: '8px', zIndex: 100, minWidth: '160px',
                                  display: 'flex', flexDirection: 'column', gap: '4px',
                                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                }}
                              >
                                <button onClick={() => handleExport('md')} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }} className="export-item"><ExternalLink size={12} /> Markdown (.md)</button>
                                <button onClick={() => handleExport('html')} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }} className="export-item"><ExternalLink size={12} /> Web Page (.html)</button>
                                <button onClick={() => handleExport('txt')} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }} className="export-item"><ExternalLink size={12} /> Plain Text (.txt)</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {showTOC && (
                        <TOC content={result} onClose={() => setShowTOC(false)} />
                      )}
                    </AnimatePresence>

                    <div className="markdown-content paper-style">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => {
                            const id = String(children).toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
                            return <h1 id={id}>{children}</h1>;
                          },
                          h2: ({ children }) => {
                            const id = String(children).toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
                            return <h2 id={id}>{children}</h2>;
                          },
                          h3: ({ children }) => {
                            const id = String(children).toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
                            return <h3 id={id}>{children}</h3>;
                          },
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            if (!inline && match && match[1] === 'echarts') {
                              return <ChartBlock config={String(children).replace(/\n$/, '')} />;
                            }
                            return <code className={className} {...props}>{children}</code>;
                          }
                        }}
                      >
                        {result}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state" style={{ border: 'none', background: 'transparent' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '20px',
                      background: 'rgba(34, 211, 238, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '24px'
                    }}>
                      <PenTool size={40} color="var(--accent-cyan)" />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>开始您的创作</h3>
                    <p style={{ maxWidth: '400px', lineHeight: '1.6' }}>
                      在设置面板配置您的 SEO 参数，点击“立即生成”即可在这里查看完美优化后的文案。
                    </p>
                    <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '300px' }}>
                      <div style={{ fontSize: '0.8rem', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                        ⚡ 极速生成
                      </div>
                      <div style={{ fontSize: '0.8rem', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                        🎯 精准 SEO
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Config Panel */}
              <AnimatePresence>
                {showConfig && (
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    className="custom-scrollbar"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      height: '100%',
                      paddingRight: '12px'
                    }}
                  >
                    <div className="config-group" style={{ background: 'rgba(129, 140, 248, 0.05)', borderColor: 'rgba(129, 140, 248, 0.2)' }}>
                      <span className="config-label" style={{ color: 'var(--accent-purple)' }}>AI 深度思考模型</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                        <div
                          onClick={() => setEnableThinking(!enableThinking)}
                          style={{
                            width: '36px',
                            height: '20px',
                            background: enableThinking ? 'var(--accent-purple)' : '#334155',
                            borderRadius: '10px',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <div style={{
                            width: '14px',
                            height: '14px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '3px',
                            left: enableThinking ? '19px' : '3px',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                        <label style={{ fontSize: '0.85rem', color: enableThinking ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }} onClick={() => setEnableThinking(!enableThinking)}>
                          开启深度思考 (Thinking Mode)
                        </label>
                      </div>
                    </div>

                    <div className="config-group" style={{ background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                      <span className="config-label" style={{ color: 'var(--accent-cyan)' }}>AI 配图建议</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                        <div
                          onClick={() => setEnableImages(!enableImages)}
                          style={{
                            width: '36px', height: '20px', background: enableImages ? 'var(--accent-cyan)' : '#334155',
                            borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s ease'
                          }}
                        >
                          <div style={{
                            width: '14px', height: '14px', background: 'white', borderRadius: '50%',
                            position: 'absolute', top: '3px', left: enableImages ? '19px' : '3px',
                            transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                        <label style={{ fontSize: '0.85rem', color: enableImages ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }} onClick={() => setEnableImages(!enableImages)}>
                          智能插入图片 (Image Insertion)
                        </label>
                      </div>
                    </div>

                    <div className="config-group">
                      <span className="config-label">
                        <Link size={12} style={{ marginRight: '6px' }} /> 锚文本自动化
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {anchorTexts.map((item, index) => (
                          <div key={index} style={{
                            display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) 1.5fr 32px', gap: '8px', alignItems: 'center'
                          }}>
                            <input
                              placeholder="关键词"
                              value={item.keyword}
                              onChange={(e) => {
                                const newTexts = [...anchorTexts];
                                newTexts[index].keyword = e.target.value;
                                setAnchorTexts(newTexts);
                              }}
                              style={{ padding: '8px', fontSize: '0.8rem' }}
                            />
                            <input
                              placeholder="https://..."
                              value={item.url}
                              onChange={(e) => {
                                const newTexts = [...anchorTexts];
                                newTexts[index].url = e.target.value;
                                setAnchorTexts(newTexts);
                              }}
                              style={{ padding: '8px', fontSize: '0.8rem' }}
                            />
                            <button
                              onClick={() => setAnchorTexts(anchorTexts.filter((_, i) => i !== index))}
                              style={{
                                width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)',
                                border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}

                        {anchorTexts.length < 5 ? (
                          <button
                            className="primary-btn"
                            style={{
                              padding: '10px', fontSize: '0.8rem', background: 'rgba(129, 140, 248, 0.05)',
                              border: '1px dashed var(--accent-purple-dim)', color: 'var(--accent-purple)', boxShadow: 'none'
                            }}
                            onClick={() => setAnchorTexts([...anchorTexts, { keyword: '', url: '' }])}
                          >
                            + 添加锚文本行 ({anchorTexts.length}/5)
                          </button>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textAlign: 'center', padding: '8px', background: 'rgba(34, 211, 238, 0.05)', borderRadius: '8px' }}>
                            💡 已达到最大限制
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="config-group">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span className="config-label">文章主题</span>
                        <input
                          placeholder="例如：2026年AI摄影趋势"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          style={{ fontSize: '1rem', padding: '14px', fontWeight: 500 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span className="config-label">语气风格</span>
                          <select value={tone} onChange={(e) => setTone(e.target.value)}>
                            <option value="Professional">专业严谨</option>
                            <option value="Casual">轻松活泼</option>
                            <option value="Creative">极富创意</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span className="config-label">预估字数</span>
                          <select value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))}>
                            {[1000, 1500, 2000, 3000, 5000].map(v => (
                              <option key={v} value={v}>{v} 字</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span className="config-label">核心关键词</span>
                        <input
                          placeholder="关键词1, 关键词2 (用逗号分隔)"
                          value={keywords}
                          onChange={(e) => setKeywords(e.target.value)}
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span className="config-label">写作视角</span>
                          <select value={perspective} onChange={(e) => setPerspective(e.target.value)}>
                            <option value="First Person (Individual)">第一人称 (我)</option>
                            <option value="Second Person (You)">第二人称 (你)</option>
                            <option value="Third Person (Objective)">第三人称 (客观)</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span className="config-label">搜索意图</span>
                          <select value={intent} onChange={(e) => setIntent(e.target.value)}>
                            <option value="Informational">信息型</option>
                            <option value="Transactional">交易型</option>
                            <option value="Commercial">商业型</option>
                          </select>
                        </div>
                      </div>

                      <button
                        className="primary-btn"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '12px',
                          height: '48px',
                          fontSize: '0.95rem',
                          marginTop: '8px',
                          background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))',
                          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        {isGenerating && genMode === 'full' ? '正在深思熟虑并创作中...' : '立即开始 AI 生成'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .markdown-content h1 { border-bottom: 3px solid #22d3ee; padding-bottom: 12px; margin-bottom: 24px; color: #0f172a !important; }
        .markdown-content h2 { color: #4f46e5 !important; margin-top: 32px; }
        .markdown-content h3 { color: #0f172a !important; margin-top: 24px; }
        .markdown-content p { color: #334155 !important; line-height: 1.8; margin-bottom: 20px; }
        .markdown-content ul, .markdown-content ol { padding-left: 20px; color: #334155 !important; margin-bottom: 20px; }
        .markdown-content li { color: #334155 !important; margin-bottom: 8px; }
        .markdown-content code:not([class*="language-"]) { background: #f1f5f9 !important; color: #e11d48 !important; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
        .view-fade { animation: fadeIn 0.3s ease; }
      `}</style>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="toast-container"
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(12px)',
              padding: '12px 24px',
              borderRadius: '30px',
              border: '1px solid var(--accent-cyan-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'white',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
              zIndex: 9999
            }}
          >
            <CheckCircle size={20} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
