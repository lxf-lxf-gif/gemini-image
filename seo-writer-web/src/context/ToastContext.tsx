import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, Info, AlertCircle, X } from 'lucide-react';
import { ToastContext } from './toastStore';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      for (const timeoutId of timeouts.values()) {
        clearTimeout(timeoutId);
      }
      timeouts.clear();
    };
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    const timeoutId = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutsRef.current.delete(id);
    }, 3000);
    timeoutsRef.current.set(id, timeoutId);
  }, []);

  const removeToast = (id: string) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none', // Allow clicks through container
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(12px)',
              padding: '12px 24px',
              borderRadius: '30px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'white',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              minWidth: '300px',
              justifyContent: 'space-between'
            }}
          >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {toast.type === 'success' && <CheckCircle size={20} color="var(--accent-cyan)" />}
                {toast.type === 'info' && <Info size={20} color="var(--accent-purple)" />}
                {toast.type === 'error' && <AlertCircle size={20} color="#ef4444" />}
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={14} />
              </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
