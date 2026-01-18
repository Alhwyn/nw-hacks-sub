// Type definitions for the Granny voice assistant app

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

export interface ConversationConfig {
  voiceId?: string;
}

export interface PermissionResult {
  success: boolean;
  status: string;
  message?: string;
}

export interface ScreenContext {
  screenshot: string;
  description: string;
}

export type ConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'speaking' 
  | 'listening' 
  | 'thinking' 
  | 'error';

export type ConversationMode = 'speaking' | 'listening' | 'thinking' | 'idle';

export interface HighlightData {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  instruction: string;
}

export interface ElectronAPI {
  permission: {
    getScreenStatus: () => Promise<string>;
    requestScreen: () => Promise<PermissionResult>;
    getMicrophoneStatus: () => Promise<string>;
    requestMicrophone: () => Promise<PermissionResult>;
  };
  conversation: {
    getSignedUrl: () => Promise<string>;
    getConfig: () => Promise<ConversationConfig>;
  };
  tts: {
    speak: (text: string, voiceId?: string) => Promise<string | null>;
    cancel: () => Promise<{ success: boolean }>;
  };
  vision: {
    analyzeScreen: (question?: string) => Promise<string>;
    captureAndDescribe: () => Promise<ScreenContext>;
  };
  screen: {
    capture: () => Promise<string | null>;
  };
  onShowHighlight?: (callback: (event: any, data: HighlightData) => void) => void;
  onClearHighlight?: (callback: (event: any) => void) => void;
  highlight?: {
    show: (x: number, y: number, width: number, height: number, label: string, instruction: string) => Promise<{ success: boolean }>;
    clear: () => Promise<{ success: boolean }>;
    findAndShow: (elementDescription: string) => Promise<{ success: boolean; message: string; found: boolean }>;
  };
  system?: {
    launchApp: (appName: string) => Promise<{ success: boolean; message: string }>;
    execute: (command: string) => Promise<{ success: boolean; output: string }>;
  };
  window?: {
    moveToCorner: () => Promise<void>;
    moveBack: () => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Typed accessor for use in renderer process
export const getElectronAPI = (): ElectronAPI => {
  return (globalThis as unknown as Window).electronAPI;
};
