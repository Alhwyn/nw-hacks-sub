// Lazy initialization - API key loaded after dotenv
function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ELEVENLABS_API_KEY in .env file');
  }
  return apiKey;
}

interface TranscriptionResponse {
  text: string;
  language_code?: string;
  language_probability?: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = getApiKey();
  
  console.log('STT request: audio size', audioBuffer.length, 'bytes');

  try {
    // Create form data with multipart/form-data
    const formData = new FormData();
    
    // Add the audio file as a blob
    // Convert Buffer to Uint8Array for Blob compatibility
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model_id', 'scribe_v1');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs STT API error: ${response.status} - ${errorText}`);
    }

    const result = (await response.json()) as TranscriptionResponse;
    console.log('STT success:', result.text.substring(0, 100) + '...');
    
    return result.text;
  } catch (error) {
    console.error('ElevenLabs STT error:', error);
    throw error;
  }
}
