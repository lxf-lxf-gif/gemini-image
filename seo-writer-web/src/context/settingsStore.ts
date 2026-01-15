import { createContext } from 'react';

export type AIProvider = 'proxy';

export interface SettingsState {
  // --- AI Configuration ---
  aiProvider: AIProvider;
  
  // Custom Proxy
  proxyToken: string;
  proxyEndpoint: string;
  model: string;
  // --- Independent Image Generation Config ---
  // If true, uses separate model but shares token/endpoint unless overridden?
  // User request: "Text and image use same token" -> implying simplify config
  // Let's keep independent MODEL, but reuse Token/Endpoint by default.
  // Actually user said "Text image use same token", so we should probably remove the independent token/endpoint config
  // and only keep independent MODEL config.
  
  imageModel: string;
  isManualModel: boolean;
  language: string;
  tone: string;
  wordCount: number;
  perspective: string;
  intent: string;
  enableThinking: boolean;
  enableImages: boolean;
  imageAspectRatio: string;
  
  // GitHub Integration
  githubToken?: string;
  githubRepo?: string;
  githubBranch?: string;
  githubPath?: string;
  
  // Legacy
  googleApiKey?: string;
}

export interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

