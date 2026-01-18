// Gemini vision service via OpenRouter

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'google/gemini-2.0-flash-001';

function getApiKey(): string {
  const apiKey = process.env.OPEN_ROUTER_API;
  if (!apiKey) {
    throw new Error('Missing OPEN_ROUTER_API in .env file');
  }
  return apiKey;
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
