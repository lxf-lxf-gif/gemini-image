import { createContext } from 'react';

export interface HistoryItem {
  id: string;
  topic: string;
  date: string;
  content: string;
}

export interface HistoryContextType {
  history: HistoryItem[];
  addToHistory: (topic: string, content: string, isUpdate?: boolean) => void;
  deleteFromHistory: (id: string) => void;
  clearHistory: () => void;
}

export const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

