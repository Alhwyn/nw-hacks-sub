import { contextBridge, ipcRenderer } from 'electron';

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Permissions
  permission: {
    getScreenStatus: () => ipcRenderer.invoke('permission:getScreenStatus'),
    requestScreen: () => ipcRenderer.invoke('permission:requestScreen'),
  },

  // Conversational AI
  conversation: {
    getSignedUrl: () => ipcRenderer.invoke('conversation:getSignedUrl'),
    getConfig: () => ipcRenderer.invoke('conversation:getConfig'),
  },

  // Vision API
  vision: {
    analyzeScreen: (question?: string) => ipcRenderer.invoke('vision:analyzeScreen', question),
    captureAndDescribe: () => ipcRenderer.invoke('vision:captureAndDescribe'),
  },

  // Screenshot (kept for potential future use)
  screen: {
    capture: () => ipcRenderer.invoke('screen:capture'),
  },
});
