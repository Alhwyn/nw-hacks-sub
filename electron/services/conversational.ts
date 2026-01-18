/**
 * ElevenLabs Conversational AI Service
 * 
 * This service calls our Vercel API to get signed URLs.
 * API keys are kept secure on the server.
 * Agent configuration (system prompt, tools) is managed in the ElevenLabs Dashboard.
 */

interface SignedUrlResponse {
  signed_url: string;
}

export interface ConversationConfig {
  voiceId?: string;
}

// Vercel API endpoint - update this after deployment
const API_URL = process.env.VERCEL_API_URL || 'http://localhost:3000';

function getVoiceId(): string | undefined {
  return process.env.VOICE_ID;
}

/**
 * Get signed URL for starting a conversation from Vercel API
 */
export async function getSignedUrl(): Promise<string> {
  const response = await fetch(`${API_URL}/api/signed-url`);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
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
