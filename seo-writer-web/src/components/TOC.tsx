import { motion } from 'framer-motion';
import { List, X, ChevronRight } from 'lucide-react';

interface TOCProps {
    content: string;
    onClose: () => void;
}

const TOC: React.FC<TOCProps> = ({ content, onClose }) => {
    const headings = content.split('\n')
        .filter(line => /^#{1,3}\s/.test(line))
        .map(line => {
            const level = line.match(/^#+/)?.[0].length || 1;
            const text = line.replace(/^#+\s/, '').trim();
            const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
            return { level, text, id };
        });

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            onClose();
        }
    };

    if (headings.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{
                position: 'fixed',
                top: '100px',
                right: '400px', // Adjacent to config panel
                width: '280px',
                maxHeight: '70vh',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '24px',
                zIndex: 1000,
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                overflowY: 'auto'
            }}
            className="custom-scrollbar"
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
                    <List size={18} /> 文章目录
                </h4>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                    <X size={18} />
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {headings.map((h, i) => (
                    <div
                        key={i}
                        onClick={() => scrollTo(h.id)}
                        style={{
                            paddingLeft: `${(h.level - 1) * 16}px`,
                            fontSize: '0.9rem',
                            color: h.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '6px'
                        }}
                        className="toc-item"
                    >
                        <ChevronRight size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                        <span style={{ fontWeight: h.level === 1 ? 600 : 400 }}>{h.text}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default TOC;
