// ElevenLabs TTS Service
// Uses direct API calls for text-to-speech functionality

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ELEVENLABS_API_KEY in .env file');
  }
  return apiKey;
}

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
}

export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const apiKey = getApiKey();
  const voiceId = options.voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Default: Sarah
  const modelId = options.modelId || 'eleven_monolingual_v1';

  console.log('TTS request:', { text: text.substring(0, 50) + '...', voiceId, modelId });

  try {
    const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('TTS success, audio size:', buffer.length, 'bytes');
    return buffer;
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    throw error;
  }
}

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

export async function getVoices(): Promise<Voice[]> {
  const apiKey = getApiKey();
  console.log('Fetching ElevenLabs voices...');

  try {
    const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { voices: Voice[] };
    console.log('Found', data.voices?.length || 0, 'voices');
    return data.voices || [];
  } catch (error) {
    console.error('ElevenLabs voices error:', error);
    throw error;
  }
}
