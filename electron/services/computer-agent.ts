import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Execute system command (macOS)
async function executeSystemCommand(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(command);
    return stdout || stderr;
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

// Launch application (macOS)
async function launchApp(appName: string): Promise<void> {
  await executeSystemCommand(`open -a "${appName}"`);
}

// System utility functions for voice commands
export async function launchApplication(appName: string): Promise<string> {
  try {
    await launchApp(appName);
    return `Launched ${appName}`;
  } catch (error: any) {
    return `Failed to launch ${appName}: ${error.message}`;
  }
}

export async function executeCommand(command: string): Promise<string> {
  return await executeSystemCommand(command);
}
