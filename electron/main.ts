import { app, BrowserWindow, ipcMain, desktopCapturer, systemPreferences, shell, dialog } from 'electron';
import path from 'path';

// Load environment variables (for Bun)
import { config } from 'dotenv';
config();

// Suppress GPU-related console warnings (cosmetic only)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-software-rasterizer');

// Check screen recording permission
function getScreenPermissionStatus(): string {
  return systemPreferences.getMediaAccessStatus('screen');
}

// Check microphone permission
function getMicrophonePermissionStatus(): string {
  return systemPreferences.getMediaAccessStatus('microphone');
}

// Request microphone permission (macOS)
async function requestMicrophonePermission(): Promise<boolean> {
  if (process.platform === 'darwin') {
    const granted = await systemPreferences.askForMediaAccess('microphone');
    return granted;
  }
  return true; // Other platforms don't need explicit permission request
}

console.log('Screen recording permission:', getScreenPermissionStatus());
console.log('Microphone permission:', getMicrophonePermissionStatus());
// Import services
import * as conversationalService from './services/conversational';
import * as visionService from './services/vision';
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

// Permission handlers
ipcMain.handle('permission:getScreenStatus', () => {
  const status = getScreenPermissionStatus();
  console.log('IPC: Screen permission status:', status);
  return status;
});

ipcMain.handle('permission:requestScreen', async () => {
  const status = getScreenPermissionStatus();
  console.log('IPC: Current screen permission status:', status);
  
  if (status === 'granted') {
    return { success: true, status: 'granted' };
  }
  
  // On macOS, we can't programmatically request screen recording permission
  // We need to guide the user to System Preferences
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Screen Recording Permission Required',
    message: 'This app needs screen recording permission to capture your screen.',
    detail: 'Click "Open System Preferences" to grant permission. After enabling, you may need to restart the app.',
    buttons: ['Open System Preferences', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
  });
  
  if (result.response === 0) {
    // Open System Preferences > Privacy & Security > Screen Recording
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    return { success: true, status: 'pending', message: 'Please grant permission and restart the app' };
  }
  
  return { success: false, status: status, message: 'Permission request cancelled' };
});

// Microphone permission handlers
ipcMain.handle('permission:getMicrophoneStatus', () => {
  const status = getMicrophonePermissionStatus();
  console.log('IPC: Microphone permission status:', status);
  return status;
});

ipcMain.handle('permission:requestMicrophone', async () => {
  const currentStatus = getMicrophonePermissionStatus();
  console.log('IPC: Current microphone permission status:', currentStatus);
  
  if (currentStatus === 'granted') {
    return { success: true, status: 'granted' };
  }
  
  // Request microphone permission (works on macOS)
  const granted = await requestMicrophonePermission();
  const newStatus = getMicrophonePermissionStatus();
  console.log('IPC: Microphone permission after request:', newStatus);
  
  return { 
    success: granted, 
    status: newStatus,
    message: granted ? 'Microphone access granted' : 'Microphone access denied'
  };
});

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

// Vision handlers
ipcMain.handle('vision:analyzeScreen', async (_, question?: string) => {
  console.log('IPC: vision:analyzeScreen called');
  try {
    const result = await visionService.analyzeScreen(question);
    console.log('IPC: Screen analysis returned successfully');
    return result;
  } catch (error) {
    console.error('IPC: Error analyzing screen:', error);
    throw error;
  }
});

ipcMain.handle('vision:captureAndDescribe', async () => {
  console.log('IPC: vision:captureAndDescribe called');
  try {
    const result = await visionService.captureAndDescribe();
    console.log('IPC: Screen capture and description returned successfully');
    return result;
  } catch (error) {
    console.error('IPC: Error capturing and describing screen:', error);
    throw error;
  }
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

// Chat handlers (Gemini via OpenRouter)
ipcMain.handle('chat:sendMessage', async (_, message: string) => {
  console.log('IPC: chat:sendMessage called');
  try {
    const response = await geminiService.sendMessage(message);
    console.log('IPC: Chat response received:', response.substring(0, 50) + '...');
    return response;
  } catch (error) {
    console.error('IPC: Error in chat:sendMessage:', error);
    throw error;
  }
});

ipcMain.handle('chat:clearHistory', async () => {
  console.log('IPC: chat:clearHistory called');
  geminiService.clearChatHistory();
  return { success: true };
});

// TTS handlers (ElevenLabs)
ipcMain.handle('tts:speak', async (_, text: string, voiceId?: string) => {
  console.log('IPC: tts:speak called');
  try {
    const audioBuffer = await elevenlabsService.textToSpeech(text, { voiceId });
    // Convert buffer to base64 for transfer to renderer
    const base64Audio = audioBuffer.toString('base64');
    console.log('IPC: TTS audio generated, size:', base64Audio.length);
    return base64Audio;
  } catch (error) {
    // Don't log cancellation as error - it's expected when user ends conversation
    if (error instanceof Error && error.message === 'TTS_CANCELLED') {
      console.log('IPC: TTS was cancelled');
      return null;
    }
    console.error('IPC: Error in tts:speak:', error);
    throw error;
  }
});

ipcMain.handle('tts:cancel', () => {
  console.log('IPC: tts:cancel called');
  elevenlabsService.cancelTTS();
  return { success: true };
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
