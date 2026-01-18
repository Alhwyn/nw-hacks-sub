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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
