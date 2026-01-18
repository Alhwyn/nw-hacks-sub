/**
 * ElevenLabs Conversational AI Service
 * 
 * This service handles authentication with ElevenLabs.
 * Agent configuration (system prompt, tools) is managed in the ElevenLabs Dashboard.
 */

interface SignedUrlResponse {
  signed_url: string;
}

export interface ConversationConfig {
  voiceId?: string;
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

/**
 * Get signed URL for starting a conversation
 */
export async function getSignedUrl(): Promise<string> {
  const apiKey = getApiKey();
  const agentId = getAgentId();

  console.log('Requesting signed URL for agent:', agentId);
  console.log('API Key length:', apiKey.length);

  const voiceId = getVoiceId();
  if (voiceId) {
    console.log('Voice override available:', voiceId);
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
 * Get optional voice override configuration
 */
export function getConversationConfig(): ConversationConfig {
  return {
    voiceId: getVoiceId(),
  };
}
