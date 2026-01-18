import { contextBridge, ipcRenderer } from 'electron';

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Conversational AI
  conversation: {
    getSignedUrl: () => ipcRenderer.invoke('conversation:getSignedUrl'),
    getConfig: () => ipcRenderer.invoke('conversation:getConfig'),
  },

  // Tools API for Calendar and Gmail
  tools: {
    execute: (toolName: string, params: Record<string, any>) => 
      ipcRenderer.invoke('tools:execute', toolName, params),
    isGoogleAuthenticated: () => 
      ipcRenderer.invoke('tools:isGoogleAuthenticated'),
    authenticateGoogle: () => 
      ipcRenderer.invoke('tools:authenticateGoogle'),
    signOutGoogle: () => 
      ipcRenderer.invoke('tools:signOutGoogle'),
  },

  // Screenshot (kept for potential future use)
  screen: {
    capture: () => ipcRenderer.invoke('screen:capture'),
  },
});
