import React, { useEffect, useState } from 'react';
import { imageDb, type ImageRecord } from '../services/imageDb';
import { Trash2, Download, Search, Image as ImageIcon, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../context/useToast';

const Gallery: React.FC = () => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  const { showToast } = useToast();

  const loadImages = async () => {
    setLoading(true);
    try {
      const records = await imageDb.getAllImages();
      setImages(records);
    } catch (error) {
      console.error('Failed to load images:', error);
      showToast('加载图片失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这张图片吗？')) {
      await imageDb.deleteImage(id);
      setImages(prev => prev.filter(img => img.id !== id));
      if (selectedImage?.id === id) setSelectedImage(null);
      showToast('图片已删除');
    }
  };

  const handleDownload = (img: ImageRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const link = document.createElement('a');
    link.href = img.base64;
    link.download = `ai-image-${img.id.slice(0, 8)}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredImages = images.filter(img => 
    img.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', margin: '0 0 8px 0' }}>素材库</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>管理所有由 AI 生成的配图 ({images.length})</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="搜索 Prompt..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '10px 10px 10px 36px', borderRadius: '12px',
                border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)', outline: 'none'
              }}
            />
          </div>
          <Button variant="secondary" onClick={loadImages} icon={<Loader2 size={16} className={loading ? "animate-spin" : ""} />}>刷新</Button>
        </div>
      </header>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : filteredImages.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', opacity: 0.7 }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <ImageIcon size={40} />
          </div>
          <p>暂无图片，请在写作页面生成</p>
        </div>
      ) : (
        <div className="custom-scrollbar" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '20px', 
          overflowY: 'auto',
          paddingBottom: '40px'
        }}>
          {filteredImages.map(img => (
            <div 
              key={img.id} 
              className="group"
              onClick={() => setSelectedImage(img)}
              style={{ 
                position: 'relative', 
                aspectRatio: '1', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                cursor: 'pointer',
                border: '1px solid var(--border-color)',
                background: '#000'
              }}
            >
              <img src={img.base64} alt={img.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
              
              <div className="overlay" style={{ 
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', 
                opacity: 0, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '12px'
              }}>
                <p style={{ color: 'white', fontSize: '0.8rem', margin: '0 0 10px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {img.prompt}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={(e) => handleDownload(img, e)}
                    style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                  >
                    <Download size={14} color="#000" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(img.id, e)}
                    style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                  >
                    <Trash2 size={14} color="white" />
                  </button>
                </div>
              </div>
              <style>{`
                .group:hover .overlay { opacity: 1; }
                .group:hover img { transform: scale(1.05); }
              `}</style>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px'
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img 
              src={selectedImage.base64} 
              alt={selectedImage.prompt} 
              style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '8px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} 
            />
            <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '12px', backdropFilter: 'blur(10px)', maxWidth: '600px', textAlign: 'center' }}>
              <p style={{ color: 'white', margin: '0 0 12px 0', fontSize: '0.95rem' }}>{selectedImage.prompt}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <Button variant="primary" onClick={() => handleDownload(selectedImage)} icon={<Download size={16} />}>下载原图</Button>
                <Button variant="ghost" onClick={() => setSelectedImage(null)} style={{ color: 'white' }}>关闭</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
