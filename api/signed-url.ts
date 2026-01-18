export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  // CORS headers for Electron app
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured' }),
      { status: 500, headers }
    );
  }

  const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`;

  const response = await fetch(url, {
    headers: { 'xi-api-key': apiKey },
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: 'ElevenLabs API error' }),
      { status: response.status, headers }
    );
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), { headers });
}
