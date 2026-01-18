// ElevenLabs Conversational AI Service
// Generates signed URLs for real-time voice conversations

interface SignedUrlResponse {
  signed_url: string;
}

export interface ConversationConfig {
  voiceId?: string;
  systemPrompt: string;
  firstMessage: string;
}

function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ELEVENLABS_API_KEY in .env file');
  }
  return apiKey;
}

function getAgentId(): string {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) {
    throw new Error('Missing ELEVENLABS_AGENT_ID in .env file. Create an agent at elevenlabs.io/conversational-ai');
  }
  return agentId;
}

function getVoiceId(): string | undefined {
  return process.env.VOICE_ID;
}

// System prompt for the elderly helper agent
const SYSTEM_PROMPT = `You are Granny's Helper - a warm, patient, and encouraging assistant designed specifically for older adults.

Your approach is gentle, clear, and unhurried. You speak like a trusted family member who has all the time in the world to help.

You never make users feel embarrassed for asking "simple" questions. Every question is valid and worthy of a thoughtful answer.

You help elderly users with everyday technology tasks including:
- Email: reading, composing, sending, and organizing messages
- Phone calls and messaging family members
- Medication reminders and health tracking
- Weather and daily planning
- Memory assistance (what happened yesterday, appointments)
- Basic troubleshooting (wifi, volume, brightness)

Your tone:
- Use simple, everyday language. Avoid tech jargon entirely.
- Give step-by-step instructions, one at a time.
- Confirm understanding before moving to the next step: "Did that work for you?"
- Be reassuring: "That's a great question" or "Let's figure this out together."
- If something goes wrong, stay calm: "No worries, let's try again."
- Speak slowly and clearly when using text-to-speech.

Responses should be SHORT (1-3 sentences) unless detailed instructions are needed. When giving steps, number them clearly.

Celebrate small wins: "You did it!"

For medical emergencies, always suggest calling emergency services or family.`;

const FIRST_MESSAGE = "Hello dear, I'm here to help you with anything you need. What can I do for you today?";

/**
 * Get signed URL for starting a conversation with custom overrides
 */
export async function getSignedUrl(): Promise<string> {
  const apiKey = getApiKey();
  const agentId = getAgentId();
  const voiceId = getVoiceId();

  console.log('Requesting signed URL for agent:', agentId);
  console.log('API Key length:', apiKey.length);
  if (voiceId) {
    console.log('Using voice override:', voiceId);
  } else {
    console.log('Using voice from agent dashboard settings');
  }

  try {
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`;
    console.log('Fetching:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as SignedUrlResponse;
    console.log('Signed URL obtained successfully');
    console.log('URL preview:', data.signed_url.substring(0, 80) + '...');
    return data.signed_url;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
}

/**
 * Get conversation configuration (voice, prompt, first message)
 */
export function getConversationConfig(): ConversationConfig {
  return {
    voiceId: getVoiceId(),
    systemPrompt: SYSTEM_PROMPT,
    firstMessage: FIRST_MESSAGE,
  };
}
