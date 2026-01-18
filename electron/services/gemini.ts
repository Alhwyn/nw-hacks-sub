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

/**
 * Summarize a conversation and extract key memories
 */
export async function summarizeConversation(
  messages: { role: string, content: string }[]
): Promise<string> {
  const apiKey = getApiKey();
  
  const conversationText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const prompt = `Analyze this conversation between an elderly user and an AI assistant.
Extract 1-2 "memories" that would be meaningful to share with their loved one (grandson/grandma).
Focus on:
- Achievements (e.g., "Learned how to send an email", "Found a new recipe")
- Emotional states (e.g., "Feeling proud", "Frustrated with the computer")
- Life updates (e.g., "Talked about finishing a quilt")

Format each memory as a single clear sentence. Return ONLY the sentences, separated by newlines.
If nothing important happened, return "Nothing noteworthy."

Conversation:
${conversationText}`;

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
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return "Nothing noteworthy.";
    }

    const result = await response.json() as any;
    return result.choices?.[0]?.message?.content || 'Nothing noteworthy.';
  } catch (error) {
    console.error('Summarization error:', error);
    return "Nothing noteworthy.";
  }
}
