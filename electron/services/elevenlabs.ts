import { ElevenLabsClient } from 'elevenlabs';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
}

export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const voiceId = options.voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Default: Sarah
  const modelId = options.modelId || 'eleven_monolingual_v1';

  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: modelId,
    output_format: 'mp3_44100_128',
  });

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

export async function getVoices() {
  const voices = await client.voices.getAll();
  return voices.voices;
}