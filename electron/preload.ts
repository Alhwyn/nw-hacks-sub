import { contextBridge, ipcRenderer } from 'electron';

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Permissions
  permission: {
    getScreenStatus: () => ipcRenderer.invoke('permission:getScreenStatus'),
    requestScreen: () => ipcRenderer.invoke('permission:requestScreen'),
    getMicrophoneStatus: () => ipcRenderer.invoke('permission:getMicrophoneStatus'),
    requestMicrophone: () => ipcRenderer.invoke('permission:requestMicrophone'),
  },

  // Conversational AI (ElevenLabs - legacy, kept for reference)
  conversation: {
    getSignedUrl: () => ipcRenderer.invoke('conversation:getSignedUrl'),
    getConfig: () => ipcRenderer.invoke('conversation:getConfig'),
  },

  // TTS API (ElevenLabs)
  tts: {
    speak: (text: string, voiceId?: string) => ipcRenderer.invoke('tts:speak', text, voiceId),
    cancel: () => ipcRenderer.invoke('tts:cancel'),
  },

  // Vision API
  vision: {
    analyzeScreen: (question?: string) => ipcRenderer.invoke('vision:analyzeScreen', question),
    captureAndDescribe: () => ipcRenderer.invoke('vision:captureAndDescribe'),
    summarizeConversation: (messages: any[]) => ipcRenderer.invoke('gemini:summarize', messages),
  },

  // Screenshot (kept for potential future use)
  screen: {
    capture: () => ipcRenderer.invoke('screen:capture'),
  },

  // Supabase API
  supabase: {
    saveMemory: (memory: any) => ipcRenderer.invoke('supabase:saveMemory', memory),
    getRecentMemories: (userId: string, limit?: number) => ipcRenderer.invoke('supabase:getRecentMemories', userId, limit),
    sendNudge: (nudge: any) => ipcRenderer.invoke('supabase:sendNudge', nudge),
  },
});
