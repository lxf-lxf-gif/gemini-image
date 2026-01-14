import { createContext } from 'react';

export interface MemoryItem {
  id: string;
  content: string;
  enabled: boolean;
  createdAt: number;
}

export interface MemoryContextType {
  memories: MemoryItem[];
  addMemory: (content: string) => void;
  removeMemory: (id: string) => void;
  toggleMemory: (id: string) => void;
  updateMemory: (id: string, content: string) => void;
}

export const MemoryContext = createContext<MemoryContextType | undefined>(undefined);
