import { contextBridge, ipcRenderer } from 'electron';

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Chat with Gemini
  chat: {
    sendMessage: (message: string) => ipcRenderer.invoke('chat:sendMessage', message),
    clearHistory: () => ipcRenderer.invoke('chat:clearHistory'),
    getHistory: () => ipcRenderer.invoke('chat:getHistory'),
  },

  // Text-to-Speech (ElevenLabs)
  tts: {
    speak: (text: string, options?: { voiceId?: string; modelId?: string }) =>
      ipcRenderer.invoke('tts:speak', text, options),
    getVoices: () => ipcRenderer.invoke('tts:getVoices'),
  },

  // Screenshot
  screen: {
    capture: () => ipcRenderer.invoke('screen:capture'),
  },
});
