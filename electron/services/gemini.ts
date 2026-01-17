import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { desktopCapturer, screen } from 'electron';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Tool definitions for Gemini
const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'take_screenshot',
    description: 'Capture a screenshot of the current screen',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_screen_info',
    description: "Get information about the user's display",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
];

// Tool execution handlers
async function executeTools(toolName: string, _args: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case 'take_screenshot':
      return await captureScreen();
    case 'get_screen_info':
      return getScreenInfo();
    default:
      return `Unknown tool: ${toolName}`;
  }
}

async function captureScreen(): Promise<string> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 },
  });

  if (sources.length > 0) {
    const screenshot = sources[0].thumbnail.toDataURL();
    return screenshot;
  }
  return 'Failed to capture screenshot';
}

function getScreenInfo(): string {
  const displays = screen.getAllDisplays();
  return JSON.stringify(
    displays.map((d) => ({
      id: d.id,
      bounds: d.bounds,
      scaleFactor: d.scaleFactor,
    }))
  );
}

// Chat interface
interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

let chatHistory: ChatMessage[] = [];

export async function sendMessage(userMessage: string): Promise<string> {
  // Add user message to history
  chatHistory.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: chatHistory,
      config: {
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });

    const result = response.candidates?.[0]?.content;

    if (!result) {
      return 'No response from Gemini';
    }

    // Check for tool calls
    const functionCallPart = result.parts?.find((part: { functionCall?: unknown }) => part.functionCall);

    if (functionCallPart?.functionCall) {
      const { name, args } = functionCallPart.functionCall as { name: string; args: Record<string, unknown> };
      const toolResult = await executeTools(name, args);

      // Send tool result back to Gemini
      chatHistory.push({
        role: 'model',
        parts: [{ text: `Tool ${name} executed.` }],
      });

      // Get final response after tool execution
      const followUp = await genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...chatHistory,
          {
            role: 'user',
            parts: [{ text: `Tool result for ${name}: ${toolResult.substring(0, 5000)}` }],
          },
        ],
      });

      const finalText = followUp.candidates?.[0]?.content?.parts?.[0]?.text || '';
      chatHistory.push({ role: 'model', parts: [{ text: finalText }] });
      return finalText;
    }

    // Regular text response
    const responseText = result.parts?.[0]?.text || '';
    chatHistory.push({ role: 'model', parts: [{ text: responseText }] });
    return responseText;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gemini error:', error);
    // Remove the failed user message from history
    chatHistory.pop();
    throw new Error(`Gemini API error: ${errorMessage}`);
  }
}

export function clearChatHistory(): void {
  chatHistory = [];
}

export function getChatHistory(): ChatMessage[] {
  return chatHistory;
}
