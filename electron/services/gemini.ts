// OpenRouter Vision service (Gemini via OpenRouter)

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'google/gemini-3-flash-preview'; // Latest Gemini 3 preview!

function getApiKey(): string {
  const apiKey = process.env.OPEN_ROUTER_API;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY in .env file');
  }
  return apiKey;
}

/**
 * Analyze an image with Gemini via OpenRouter
 * @param base64Image - Base64 encoded image (data URL format)
 * @param prompt - Question or instruction about the image
 * @returns Analysis result from Gemini
 */
export async function analyzeImage(
  base64Image: string,
  prompt: string
): Promise<string> {
  const apiKey = getApiKey();

  // Validate the image data URL
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('Invalid image: base64Image is empty or not a string');
  }

  // Ensure it's a proper data URL format
  const dataUrlMatch = base64Image.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);
  if (!dataUrlMatch) {
    throw new Error(`Invalid image data URL format. Expected "data:image/[type];base64,..." but got: ${base64Image.substring(0, 60)}...`);
  }

  // Check that there's actual base64 content after the prefix
  const base64Content = base64Image.split(',')[1];
  if (!base64Content || base64Content.length < 100) {
    throw new Error(`Image data appears to be empty or too small (${base64Content?.length || 0} chars)`);
  }

  console.log(`[Gemini] Sending image to OpenRouter: ${dataUrlMatch[0]}... (${base64Image.length} total chars)`);

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Odly Assistant',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: base64Image } },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter Vision API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as any;
  return result.choices?.[0]?.message?.content || 'No analysis returned';
}
