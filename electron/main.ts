import { app, BrowserWindow, ipcMain, desktopCapturer, systemPreferences, shell, dialog, screen } from 'electron';
import path from 'path';

// Load environment variables (for Bun)
import { config } from 'dotenv';
config();

// Suppress GPU-related console warnings (cosmetic only)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-software-rasterizer');

// Check screen recording permission (macOS only)
function getScreenPermissionStatus(): string {
  if (process.platform === 'darwin') {
    return systemPreferences.getMediaAccessStatus('screen');
  }
  return 'granted'; // Linux/Windows don't have this restriction
}

// Check microphone permission (macOS only)
function getMicrophonePermissionStatus(): string {
  if (process.platform === 'darwin') {
    return systemPreferences.getMediaAccessStatus('microphone');
  }
  return 'granted'; // Linux/Windows don't have this restriction
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

// Store original window position for movement animation
let originalPosition: { x: number; y: number } | null = null;

// Import services
import * as conversationalService from './services/conversational';
import * as visionService from './services/vision';
import * as elevenlabsService from './services/elevenlabs';
import { createOverlayWindow, showHighlight, clearHighlight } from './overlay';
import { startHighlightServer, stopHighlightServer } from './services/highlight';
import { launchApplication, executeCommand } from './services/computer-agent';

function createWindow(): void {
  const display = screen.getPrimaryDisplay();
  const { width, height, x, y } = display.workArea;
    const WINDOW_WIDTH = 400;

  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: height,
    x: x + width - WINDOW_WIDTH,
    y: y,
    minWidth: 320,
    minHeight: 380,
    maxWidth: WINDOW_WIDTH,
    resizable: false,
    alwaysOnTop: true, // Keep window always visible on top
    
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
    win.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }
}

// ==================== IPC HANDLERS ====================

// Permission handlers
ipcMain.handle('permission:getScreenStatus', () => {
  return getScreenPermissionStatus();
});

ipcMain.handle('permission:requestScreen', async () => {
  const status = getScreenPermissionStatus();
  
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
  return getMicrophonePermissionStatus();
});

ipcMain.handle('permission:requestMicrophone', async () => {
  const currentStatus = getMicrophonePermissionStatus();
  
  if (currentStatus === 'granted') {
    return { success: true, status: 'granted' };
  }
  
  const granted = await requestMicrophonePermission();
  const newStatus = getMicrophonePermissionStatus();
  
  return { 
    success: granted, 
    status: newStatus,
    message: granted ? 'Microphone access granted' : 'Microphone access denied'
  };
});

// Conversational AI handlers
ipcMain.handle('conversation:getSignedUrl', async () => {
  try {
    return await conversationalService.getSignedUrl();
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
});

ipcMain.handle('conversation:getConfig', () => {
  return conversationalService.getConversationConfig();
});

// Vision handlers
ipcMain.handle('vision:analyzeScreen', async (_, question?: string) => {
  try {
    return await visionService.analyzeScreen(question);
  } catch (error) {
    console.error('Error analyzing screen:', error);
    throw error;
  }
});

ipcMain.handle('vision:captureAndDescribe', async () => {
  try {
    return await visionService.captureAndDescribe();
  } catch (error) {
    console.error('Error capturing screen:', error);
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


// TTS handlers (ElevenLabs)
ipcMain.handle('tts:speak', async (_, text: string, voiceId?: string) => {
  try {
    const audioBuffer = await elevenlabsService.textToSpeech(text, { voiceId });
    return audioBuffer.toString('base64');
  } catch (error) {
    if (error instanceof Error && error.message === 'TTS_CANCELLED') {
      return null;
    }
    console.error('TTS error:', error);
    throw error;
  }
});

ipcMain.handle('tts:cancel', () => {
  elevenlabsService.cancelTTS();
  return { success: true };
});

// Highlight overlay handlers
ipcMain.handle('highlight:show', (_, data: { x: number; y: number; width: number; height: number; label: string; instruction: string }) => {
  showHighlight(data);
  return { success: true };
});

ipcMain.handle('highlight:clear', () => {
  clearHighlight();
  return { success: true };
});

// Find and highlight - combines vision detection with highlighting
ipcMain.handle('highlight:findAndShow', async (_, elementDescription: string) => {
  try {
    const location = await visionService.findElement(elementDescription);
    
    if (!location.found) {
      return { 
        success: false, 
        message: `Could not find "${elementDescription}" on screen`,
        found: false 
      };
    }
    
    showHighlight({
      x: location.x,
      y: location.y,
      width: location.width,
      height: location.height,
      label: elementDescription.toUpperCase(),
      instruction: `Click here - ${location.description}`,
    });
    
    return { 
      success: true, 
      message: `Found and highlighted: ${location.description}`,
      found: true,
      location 
    };
  } catch (error) {
    console.error('Error in findAndShow:', error);
    return { 
      success: false, 
      message: `Error finding element: ${error}`,
      found: false 
    };
  }
});

// System control handlers
ipcMain.handle('system:launchApp', async (_, appName: string) => {
  try {
    const result = await launchApplication(appName);
    return { success: true, message: result };
  } catch (error) {
    console.error('Error launching app:', error);
    throw error;
  }
});

ipcMain.handle('system:execute', async (_, command: string) => {
  try {
    const result = await executeCommand(command);
    return { success: true, output: result };
  } catch (error) {
    console.error('Error executing command:', error);
    throw error;
  }
});

// Window movement handlers
const WINDOW_WIDTH = 360;

ipcMain.handle('window:moveToCorner', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  
  if (!originalPosition) {
    const position = win.getPosition();
    originalPosition = { x: position[0] || 0, y: position[1] || 0 };
  }
  
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const newX = workArea.x + workArea.width - WINDOW_WIDTH - 20;
  const newY = workArea.y + 20;
  
  win.setPosition(newX, newY, true);
});

ipcMain.handle('window:moveBack', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win || !originalPosition) return;
  
  win.setPosition(originalPosition.x, originalPosition.y, true);
  originalPosition = null;
});

// ==================== APP LIFECYCLE ====================

app.whenReady().then(() => {
  createWindow();
  
  // Create overlay window for screen highlights
  createOverlayWindow();
  
  // Start HTTP server for Python integration
  startHighlightServer();
});

app.on('window-all-closed', () => {
  stopHighlightServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
