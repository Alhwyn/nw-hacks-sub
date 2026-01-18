import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron';
import path from 'path';

// Load environment variables (for Bun)
import { config } from 'dotenv';
config();

// Import services
import * as conversationalService from './services/conversational';

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
      sandbox: false, // Required for AudioWorklet support in @11labs/client
      webSecurity: false, // Required for AudioWorklet blob URLs in file:// protocol
      enableBlinkFeatures: 'Autofill', // Suppress Autofill DevTools errors
    },
  });

  // Make window rounded corners (macOS)
  win.setWindowButtonVisibility?.(true);

  // Set Content Security Policy to allow AudioWorklet (blob:) and WebSockets (wss:)
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: wss: https:"
        ]
      }
    });
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadFile(path.join(__dirname, '../src/index.html'));
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ==================== IPC HANDLERS ====================

// Conversational AI handlers
ipcMain.handle('conversation:getSignedUrl', async () => {
  console.log('IPC: conversation:getSignedUrl called');
  try {
    const url = await conversationalService.getSignedUrl();
    console.log('IPC: Signed URL returned successfully');
    return url;
  } catch (error) {
    console.error('IPC: Error getting signed URL:', error);
    throw error;
  }
});

ipcMain.handle('conversation:getConfig', async () => {
  console.log('IPC: conversation:getConfig called');
  const config = conversationalService.getConversationConfig();
  console.log('IPC: Config returned');
  return config;
});

// Screenshot handler (kept for potential future use)
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
