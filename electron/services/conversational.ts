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

  const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as SignedUrlResponse;
  return data.signed_url;
}

/**
 * Get optional voice override configuration
 */
export function getConversationConfig(): ConversationConfig {
  return {
    voiceId: getVoiceId(),
  };
}
