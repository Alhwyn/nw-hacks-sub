// Vision service for screen capture and analysis
import { desktopCapturer } from 'electron';
// Vision analysis disabled: OpenRouter removed per requirement

export interface ScreenContext {
  screenshot: string;
  description: string;
}

/**
 * Capture a screenshot of the primary display
 * @returns Base64 encoded screenshot as data URL
 */
async function captureScreenshot(): Promise<string> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    const primaryScreen = sources[0];
    if (!primaryScreen) {
      throw new Error('No screen source available');
    }

    const screenshot = primaryScreen.thumbnail.toDataURL();
    console.log('Screenshot captured:', screenshot.length, 'bytes');
    return screenshot;
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    throw error;
  }
}

/**
 * Capture and describe what's currently on screen
 * Provides a general overview for conversational context
 */
export async function captureAndDescribe(): Promise<ScreenContext> {
  console.log('=== captureAndDescribe called ===');
  
  try {
    const screenshot = await captureScreenshot();
    
    const description =
      'Screen capture succeeded, but vision analysis is disabled. Use the view_screen tool with ElevenLabs only or describe the screen manually.';
    console.log('Screen description generated (vision disabled).');
    
    return {
      screenshot,
      description,
    };
  } catch (error) {
    console.error('captureAndDescribe error:', error);
    throw error;
  }
}

/**
 * Analyze the screen with a specific question
 * Used when the agent needs more detailed information
 * @param question - Specific question about what's on screen
 */
export async function analyzeScreen(question?: string): Promise<string> {
  console.log('=== analyzeScreen called ===');
  console.log('Question:', question || 'No specific question');
  
  try {
    const screenshot = await captureScreenshot();
    
    void screenshot;
    const analysis =
      'Screen analysis is disabled (OpenRouter removed). Use ElevenLabs tools only.';
    console.log('Screen analysis disabled.');
    return analysis;
  } catch (error) {
    console.error('analyzeScreen error:', error);
    throw error;
  }
}
