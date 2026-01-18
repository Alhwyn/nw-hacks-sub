import { ElevenLabsClient } from 'elevenlabs';

// Lazy initialization - client created on first use after dotenv loads
let client: ElevenLabsClient | null = null;

// Track active TTS request for cancellation
let currentTTSAbortController: AbortController | null = null;

function getClient(): ElevenLabsClient {
  if (!client) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('Missing ELEVENLABS_API_KEY in .env file');
    }
    console.log('Initializing ElevenLabs with API key:', apiKey.substring(0, 10) + '...');
    client = new ElevenLabsClient({ apiKey });
  }
  return client;
}

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
}

/**
 * Cancel any ongoing TTS request
 */
export function cancelTTS(): void {
  if (currentTTSAbortController) {
    console.log('Cancelling active TTS request');
    currentTTSAbortController.abort();
    currentTTSAbortController = null;
  }
}

export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  // Cancel any previous TTS request
  cancelTTS();

  const elevenlabs = getClient();
  const voiceId = options.voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Default: Sarah
  const modelId = options.modelId || 'eleven_monolingual_v1';

  // Create new abort controller for this request
  currentTTSAbortController = new AbortController();
  const signal = currentTTSAbortController.signal;

  console.log('TTS request:', { text: text.substring(0, 50) + '...', voiceId, modelId });

  try {
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      model_id: modelId,
      output_format: 'mp3_44100_128',
    });

    // Convert stream to buffer with abort check
    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      // Check if request was cancelled
      if (signal.aborted) {
        console.log('TTS request was cancelled during streaming');
        throw new Error('TTS_CANCELLED');
      }
      chunks.push(chunk);
    }
    
    console.log('TTS success, audio size:', chunks.reduce((a, b) => a + b.length, 0), 'bytes');
    currentTTSAbortController = null;
    return Buffer.concat(chunks);
  } catch (error) {
    currentTTSAbortController = null;
    
    // Don't log cancellation as an error
    if (error instanceof Error && error.message === 'TTS_CANCELLED') {
      throw error;
    }
    
    // Check if it's an abort error
    if (signal.aborted) {
      console.log('TTS request aborted');
      throw new Error('TTS_CANCELLED');
    }
    
    console.error('ElevenLabs TTS error:', error);
    throw error;
  }
}

export async function getVoices() {
  const elevenlabs = getClient();
  console.log('Fetching ElevenLabs voices...');
  try {
    const voices = await elevenlabs.voices.getAll();
    console.log('Found', voices.voices?.length || 0, 'voices');
    return voices.voices;
  } catch (error) {
    console.error('ElevenLabs voices error:', error);
    throw error;
  }
}