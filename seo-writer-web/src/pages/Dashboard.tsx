import React from 'react';
import { motion } from 'framer-motion';
import { PenTool, Sparkles } from 'lucide-react';
import { useHistory } from '../context/useHistory';
import { useSettings } from '../context/useSettings';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';

const Dashboard: React.FC = () => {
  const { history } = useHistory();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const totalWords = history.reduce((acc, item) => acc + item.content.length, 0);
  const wordCountGoal = 10000;
  const progress = Math.min(100, (totalWords / wordCountGoal) * 100);

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
          Control Dashboard
        </h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <GlassCard style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>累计生成文章</div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--accent-cyan)', lineHeight: 1 }}>{history.length}</div>
        </GlassCard>
        <GlassCard style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>累计创作字数</div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--accent-purple)', lineHeight: 1 }}>
            {(totalWords / 1000).toFixed(1)}k
          </div>
        </GlassCard>
        <GlassCard style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>生成效率评级</div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--accent-indigo)', lineHeight: 1 }}>A+</div>
        </GlassCard>
        <GlassCard style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>当前 AI 模型</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
            {settings.model.replace('gemini-', '').replace('-flash', '').toUpperCase()}
          </div>
        </GlassCard>
      </div>

      <GlassCard variant="panel">
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>字数里程碑 (Word Count Goal)</h3>
        <div style={{ background: 'rgba(255,255,255,0.05)', height: '14px', borderRadius: '7px', overflow: 'hidden', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            style={{ background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))', height: '100%', borderRadius: '7px' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontFamily: 'monospace' }}>{totalWords.toLocaleString()} / {wordCountGoal.toLocaleString()}</span>
          <span>大师级写作者勋章</span>
        </div>
      </GlassCard>

      <GlassCard variant="panel">
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>最近活动 (Recent Activity)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.slice(0, 5).map(item => (
            <GlassCard key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500 }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-cyan)' }}>
                  <PenTool size={16} />
                </div>
                {item.topic}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{item.date}</span>
            </GlassCard>
          ))}
          {history.length === 0 && (
            <div className="empty-state">
              <Sparkles size={40} className="empty-state-icon" style={{ opacity: 0.5, marginBottom: '16px' }} />
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>准备好开始了吗？</h4>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>点击 AI Writer 开启您的创作之旅。</p>
              <Button style={{ marginTop: '24px' }} onClick={() => navigate('/writer')} icon={<PenTool size={16} />}>
                立即创作
              </Button>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default Dashboard;
