import { desktopCapturer, systemPreferences, shell, dialog } from 'electron';

export function getScreenPermissionStatus(): string {
  return systemPreferences.getMediaAccessStatus('screen');
}

export function getMicrophonePermissionStatus(): string {
  return systemPreferences.getMediaAccessStatus('microphone');
}

// Permission requesting
export async function requestMicrophonePermission(): Promise<boolean> {
  if (process.platform === 'darwin') {
    return await systemPreferences.askForMediaAccess('microphone');
  }
  return true;
}

export async function requestScreenPermission(): Promise<{ success: boolean; status: string; message?: string }> {
  const status = getScreenPermissionStatus();
  if (status === 'granted') {
    return { success: true, status: 'granted' };
  }
  
  // macOS can't programmatically request screen recording - guide user to System Preferences
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Screen Recording Permission Required',
    message: 'This app needs screen recording permission.',
    detail: 'Click "Open System Preferences" to grant permission.',
    buttons: ['Open System Preferences', 'Cancel'],
  });
  
  if (result.response === 0) {
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    return { success: true, status: 'pending', message: 'Please grant permission and restart' };
  }
  
  return { success: false, status, message: 'Cancelled' };
}

export async function captureScreenshot(options?: { width?: number; height?: number }): Promise<string | null> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: options?.width ?? 1920, height: options?.height ?? 1080 },
  });
  
  return sources[0]?.thumbnail?.toDataURL() ?? null;
}
