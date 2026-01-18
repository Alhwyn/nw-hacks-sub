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
  },

  // Screenshot (kept for potential future use)
  screen: {
    capture: () => ipcRenderer.invoke('screen:capture'),
  },

  // Overlay highlight listeners
  onShowHighlight: (callback: any) => {
    ipcRenderer.on('show-highlight', callback);
  },
  offShowHighlight: (callback: any) => {
    ipcRenderer.removeListener('show-highlight', callback);
  },
  onClearHighlight: (callback: any) => {
    ipcRenderer.on('clear-highlight', callback);
  },
  offClearHighlight: (callback: any) => {
    ipcRenderer.removeListener('clear-highlight', callback);
  },

  // Highlight control
  highlight: {
    show: (x: number, y: number, width: number, height: number, label: string, instruction: string) =>
      ipcRenderer.invoke('highlight:show', { x, y, width, height, label, instruction }),
    clear: () => ipcRenderer.invoke('highlight:clear'),
    findAndShow: (elementDescription: string) => 
      ipcRenderer.invoke('highlight:findAndShow', elementDescription),
  },

  // System control
  system: {
    launchApp: (appName: string) => ipcRenderer.invoke('system:launchApp', appName),
    execute: (command: string) => ipcRenderer.invoke('system:execute', command),
  },

  // Window control
  window: {
    moveToCorner: () => ipcRenderer.invoke('window:moveToCorner'),
    moveBack: () => ipcRenderer.invoke('window:moveBack'),
  },
});
