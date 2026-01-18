import { Memory, RelationshipNudge, UserRole } from '../../electron/types';

export type { Memory, RelationshipNudge, UserRole };

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
    summarizeConversation: (messages: { role: string, content: string }[]) => Promise<string>;
  };
  screen: {
    capture: () => Promise<string | null>;
  };
  supabase: {
    saveMemory: (memory: Omit<Memory, 'id' | 'timestamp'>) => Promise<any>;
    getRecentMemories: (userId: UserRole, limit?: number) => Promise<Memory[]>;
    sendNudge: (nudge: Omit<RelationshipNudge, 'id' | 'timestamp' | 'status'>) => Promise<any>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
