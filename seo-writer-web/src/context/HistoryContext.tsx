import React, { useState, useEffect } from 'react';
import { HistoryContext, type HistoryItem } from './historyStore';

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
      const savedHistory = localStorage.getItem('seo_history');
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory) as unknown;
          if (Array.isArray(parsed)) {
            const cleaned: HistoryItem[] = parsed
              .filter((x): x is HistoryItem => {
                if (!x || typeof x !== 'object') return false;
                const obj = x as Record<string, unknown>;
                return typeof obj.id === 'string'
                  && typeof obj.topic === 'string'
                  && typeof obj.date === 'string'
                  && typeof obj.content === 'string';
              });
            return cleaned;
          }
          return [];
        } catch {
          return [];
        }
      }
      return [];
  });

  // Save persistence
  useEffect(() => {
    localStorage.setItem('seo_history', JSON.stringify(history));
  }, [history]);

  const addToHistory = (topic: string, content: string, isUpdate: boolean = false) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setHistory((prev) => {
      const baseId = isUpdate && prev.length > 0 ? prev[0].id : id;
      const newItem: HistoryItem = {
        id: baseId,
        topic: topic || "未命名主题",
        date: new Date().toLocaleString(),
        content
      };
      if (isUpdate && prev.length > 0) return [newItem, ...prev.slice(1)];
      return [newItem, ...prev].slice(0, 50);
    });
  };

  const deleteFromHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <HistoryContext.Provider value={{ history, addToHistory, deleteFromHistory, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};
