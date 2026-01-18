import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron';
import path from 'path';

// Load environment variables (for Bun)
import { config } from 'dotenv';
config();

// Import services
import * as geminiService from './services/gemini';
import * as elevenlabsService from './services/elevenlabs';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 700,
    height: 500,
    minWidth: 500,
    minHeight: 400,
    
    // Glassy/Transparent window settings
    transparent: true,     // Enable transparency
    frame: false,          // Frameless for custom title bar
    titleBarStyle: 'hidden', // Hide default title bar (macOS)
    vibrancy: 'under-window', // macOS blur effect
    visualEffectState: 'active', // Keep vibrancy active
    backgroundColor: '#00000000', // Fully transparent background
    
    // Windows 11 Mica/Acrylic effect
    backgroundMaterial: 'acrylic',
    
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Make window rounded corners (macOS)
  win.setWindowButtonVisibility?.(true);

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadFile(path.join(__dirname, '../src/index.html'));
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ==================== IPC HANDLERS ====================

// Chat handlers (Gemini)
ipcMain.handle('chat:sendMessage', async (_event, message: string) => {
  return await geminiService.sendMessage(message);
});

ipcMain.handle('chat:clearHistory', async () => {
  geminiService.clearChatHistory();
  return { success: true };
});

ipcMain.handle('chat:getHistory', async () => {
  return geminiService.getChatHistory();
});

// TTS handlers (ElevenLabs)
ipcMain.handle('tts:speak', async (_event, text: string, options?: elevenlabsService.TTSOptions) => {
  const audioBuffer = await elevenlabsService.textToSpeech(text, options);
  return audioBuffer.toString('base64');
});

ipcMain.handle('tts:getVoices', async () => {
  return await elevenlabsService.getVoices();
});

// Screenshot handler
ipcMain.handle('screen:capture', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 },
  });

  if (sources.length > 0) {
    return sources[0]?.thumbnail?.toDataURL() || null;
  }
  return null;
});

// ==================== APP LIFECYCLE ====================

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
