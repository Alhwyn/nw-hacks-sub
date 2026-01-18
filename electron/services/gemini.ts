import { desktopCapturer, screen } from 'electron';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'google/gemini-2.0-flash-001';

function getApiKey(): string {
  const apiKey = process.env.OPEN_ROUTER_API;
  if (!apiKey) {
    throw new Error('Missing OPEN_ROUTER_API in .env file');
  }
  return apiKey;
}

// Tool definitions for OpenRouter (OpenAI format)
const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'take_screenshot',
      description: 'Capture a screenshot of the current screen',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_screen_info',
      description: "Get information about the user's display",
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
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

  const firstSource = sources[0];
  if (firstSource) {
    const screenshot = firstSource.thumbnail.toDataURL();
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

// Chat interface (OpenAI format)
interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

let chatHistory: ChatMessage[] = [];

async function callOpenRouter(messages: ChatMessage[], includeTools = true): Promise<any> {
  const apiKey = getApiKey();
  
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
  };
  
  if (includeTools) {
    body.tools = toolDefinitions;
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://odly.app',
      'X-Title': 'Odly',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function sendMessage(userMessage: string): Promise<string> {
  console.log('OpenRouter request:', userMessage.substring(0, 100) + '...');
  
  // Add user message to history
  chatHistory.push({
    role: 'user',
    content: userMessage,
  });

  try {
    console.log('Calling OpenRouter API with', chatHistory.length, 'messages in history');
    const response = await callOpenRouter(chatHistory);
    console.log('OpenRouter response received');

    const choice = response.choices?.[0];
    const message = choice?.message;

    if (!message) {
      return 'No response from OpenRouter';
    }

    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const { name, arguments: argsString } = toolCall.function;
      const args = argsString ? JSON.parse(argsString) : {};
      
      const toolResult = await executeTools(name, args);

      // Add assistant message with tool call
      chatHistory.push({
        role: 'assistant',
        content: '',
        tool_calls: message.tool_calls,
      });

      // Add tool result
      chatHistory.push({
        role: 'tool',
        content: toolResult.substring(0, 5000),
        tool_call_id: toolCall.id,
      });

      // Get final response after tool execution
      const followUp = await callOpenRouter(chatHistory, false);
      const finalText = followUp.choices?.[0]?.message?.content || '';
      
      chatHistory.push({ role: 'assistant', content: finalText });
      return finalText;
    }

    // Regular text response
    const responseText = message.content || '';
    chatHistory.push({ role: 'assistant', content: responseText });
    return responseText;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('OpenRouter error:', error);
    // Remove the failed user message from history
    chatHistory.pop();
    throw new Error(`OpenRouter API error: ${errorMessage}`);
  }
}

export function clearChatHistory(): void {
  chatHistory = [];
}

export function getChatHistory(): ChatMessage[] {
  return chatHistory;
}

/**
 * Analyze an image with Gemini vision model via OpenRouter
 * @param base64Image - Base64 encoded image (data URL format)
 * @param prompt - Question or instruction about the image
 * @returns Analysis result from Gemini
 */
export async function analyzeImage(
  base64Image: string,
  prompt: string
): Promise<string> {
  const apiKey = getApiKey();
  
  console.log('Vision request:', prompt.substring(0, 100) + '...');
  console.log('Image size:', base64Image.length, 'bytes');

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://odly.app',
        'X-Title': 'Odly',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter Vision API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as any;
    const analysisText = result.choices?.[0]?.message?.content || 'No analysis returned';
    
    console.log('Vision analysis success:', analysisText.substring(0, 100) + '...');
    return analysisText;
  } catch (error) {
    console.error('Vision analysis error:', error);
    throw error;
  }
}
