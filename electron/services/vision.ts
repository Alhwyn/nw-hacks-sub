// Vision service for screen capture and analysis
import { desktopCapturer } from 'electron';
import * as geminiService from './gemini';

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
    
    const prompt = `Describe what you see on this screen in 2-3 sentences. 
Focus on:
- What applications or windows are open
- The main content or task the user appears to be doing
- Any notable UI elements or text that's visible

Keep it concise and relevant for helping an elderly user.`;

    const description = await geminiService.analyzeImage(screenshot, prompt);
    
    console.log('Screen description generated:', description.substring(0, 100) + '...');
    
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
    
    const prompt = question 
      ? `Looking at this screen: ${question}`
      : `Describe what you see on this screen. Focus on applications, content, and any text or UI elements that would help understand what the user is looking at.`;

    const analysis = await geminiService.analyzeImage(screenshot, prompt);
    
    console.log('Screen analysis complete:', analysis.substring(0, 100) + '...');
    
    return analysis;
  } catch (error) {
    console.error('analyzeScreen error:', error);
    throw error;
  }
}
