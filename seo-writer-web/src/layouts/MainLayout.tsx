import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Layout, PenTool, History, Settings, Image as ImageIcon } from 'lucide-react';

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', icon: <Layout size={20} />, label: 'Dashboard' },
    { path: '/writer', icon: <PenTool size={20} />, label: 'AI Writer' },
    { path: '/history', icon: <History size={20} />, label: 'History' },
    { path: '/gallery', icon: <ImageIcon size={20} />, label: 'Gallery' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo text-gradient" style={{ padding: '0 12px' }}>
          <Sparkles size={28} />
          <span style={{ fontSize: '1.4rem' }}>SEO Writer</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {navItems.map((item) => (
            <div
              key={item.path}
              className={`glass-card nav-item ${isActive(item.path) ? 'active' : ''}`}
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                background: isActive(item.path) ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: '1px solid ' + (isActive(item.path) ? 'var(--accent-cyan-dim)' : 'transparent'),
                color: isActive(item.path) ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
              onClick={() => navigate(item.path)}
            >
              <div style={{ color: isActive(item.path) ? 'var(--accent-cyan)' : 'var(--text-dim)' }}>
                {item.icon}
              </div>
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
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
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
