import { contextBridge, ipcRenderer } from 'electron';

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Conversational AI
  conversation: {
    getSignedUrl: () => ipcRenderer.invoke('conversation:getSignedUrl'),
    getConfig: () => ipcRenderer.invoke('conversation:getConfig'),
  },

  // Screenshot (kept for potential future use)
  screen: {
    capture: () => ipcRenderer.invoke('screen:capture'),
  },
});
