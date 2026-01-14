import React, { useState, useEffect } from 'react';
import { MemoryContext, type MemoryItem } from './memoryStore';

export const MemoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('seo_memories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('seo_memories', JSON.stringify(memories));
  }, [memories]);

  const addMemory = (content: string) => {
    if (!content.trim()) return;
    const newItem: MemoryItem = {
      id: crypto.randomUUID(),
      content: content.trim(),
      enabled: true,
      createdAt: Date.now()
    };
    setMemories(prev => [newItem, ...prev]);
  };

  const removeMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const toggleMemory = (id: string) => {
    setMemories(prev => prev.map(m => 
      m.id === id ? { ...m, enabled: !m.enabled } : m
    ));
  };

  const updateMemory = (id: string, content: string) => {
    setMemories(prev => prev.map(m => 
      m.id === id ? { ...m, content } : m
    ));
  };

  return (
    <MemoryContext.Provider value={{ memories, addMemory, removeMemory, toggleMemory, updateMemory }}>
      {children}
    </MemoryContext.Provider>
  );
};
