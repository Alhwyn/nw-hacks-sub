// Vision service for screen capture and analysis
import { desktopCapturer, screen as electronScreen } from 'electron';
import * as geminiService from './gemini';

export interface ScreenContext {
  screenshot: string;
  description: string;
}

export interface ElementLocation {
  found: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

/**
 * Capture a screenshot of the primary display
 * @returns Base64 encoded screenshot as data URL
 */
async function captureScreenshot(): Promise<string> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 },
  });

  const primaryScreen = sources[0];
  if (!primaryScreen) {
    throw new Error('No screen source available');
  }

  return primaryScreen.thumbnail.toDataURL();
}

/**
 * Capture and describe what's currently on screen
 * Provides a general overview for conversational context
 */
export async function captureAndDescribe(): Promise<ScreenContext> {
  const screenshot = await captureScreenshot();
  
  const prompt = `Describe what you see on this screen in 2-3 sentences. 
Focus on:
- What applications or windows are open
- The main content or task the user appears to be doing
- Any notable UI elements or text that's visible

Keep it concise and relevant for helping an elderly user.`;

  const description = await geminiService.analyzeImage(screenshot, prompt);
  
  return { screenshot, description };
}

/**
 * Analyze the screen with a specific question
 * Used when the agent needs more detailed information
 * @param question - Specific question about what's on screen
 */
export async function analyzeScreen(question?: string): Promise<string> {
  const screenshot = await captureScreenshot();
  
  const prompt = question 
    ? `Looking at this screen: ${question}`
    : `Describe what you see on this screen. Focus on applications, content, and any text or UI elements that would help understand what the user is looking at.`;

  return await geminiService.analyzeImage(screenshot, prompt);
}

/**
 * Find a specific UI element on screen and return its coordinates
 * @param elementDescription - Description of element to find (e.g., "publish button", "search bar")
 * @returns Element location with bounding box coordinates
 */
export async function findElement(elementDescription: string): Promise<ElementLocation> {
  try {
    const screenshot = await captureScreenshot();
    const display = electronScreen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.size;
    
    const prompt = `Find the "${elementDescription}" on this screen.

IMPORTANT: Return ONLY a JSON object with these exact fields, no other text:
{
  "found": true or false,
  "x": number (pixel X coordinate of the LEFT edge of the element),
  "y": number (pixel Y coordinate of the TOP edge of the element),
  "width": number (width of the element in pixels),
  "height": number (height of the element in pixels),
  "description": "brief description of what you found"
}

Screen dimensions: ${screenWidth}x${screenHeight} pixels.

Guidelines:
- x=0 is the left edge, x=${screenWidth} is the right edge
- y=0 is the top edge, y=${screenHeight} is the bottom edge
- Be precise with coordinates based on where the element actually appears
- If you cannot find the element, set "found" to false
- Add some padding (10-20px) around the element for visibility

Return ONLY the JSON object, nothing else.`;

    const response = await geminiService.analyzeImage(screenshot, prompt);
    
    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        found: result.found ?? false,
        x: result.x ?? 0,
        y: result.y ?? 0,
        width: result.width ?? 100,
        height: result.height ?? 50,
        description: result.description ?? 'Element',
      };
    }
    
    return {
      found: false,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      description: `Could not locate "${elementDescription}"`,
    };
  } catch (error) {
    return {
      found: false,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      description: `Error finding element: ${error}`,
    };
  }
}
