# odly

Installing dependencies the legitimate way:
```bash
    # make sure your python versions are correct. I'd recommend using pyenv -> set python version to 3.12.9
    pip install playwright
    playwright install chromium # for unix users
```

To install dependencies (the noob way):

```bash
bun install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following:

```env
# Vercel API URL (for production deployment)
VERCEL_API_URL=URL

# Optional: OpenAI API key if using OpenAI features
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Voice override
VOICE_ID=your_voice_id_here  # Optional - uses dashboard voice if not set
```

**Important Notes:**
- The `VERCEL_API_URL` should point to your deployed Vercel API (see Deployment section below)
- ElevenLabs API keys are now stored securely on Vercel, not in your local `.env`
- For local development without Vercel, set `VERCEL_API_URL=http://localhost:3000` and run `vercel dev`

### 3. Run the Application

**Development Mode:**
```bash
bun run dev
```

**Production Build:**
```bash
bun run build
bun run start
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying the API to Vercel.

**Quick Summary:**

1. Deploy API to Vercel:
```bash
vercel --prod
```

2. Set environment variables on Vercel:
```bash
vercel env add ELEVENLABS_API_KEY
vercel env add ELEVENLABS_AGENT_ID
```

3. Update your `.env` with the production URL:
```env
VERCEL_API_URL=https://nwhacks-nine.vercel.app/
```

4. Run the app:
```bash
bun run dev
```

## Features

- Real-time voice conversations with ElevenLabs Conversational AI
- Auto-starts conversation when app opens
- Live transcript display
- Optimized for elderly users with simple, patient responses

## Tech Stack

- **Electron** - Desktop app framework
- **Bun** - JavaScript runtime and package manager
- **TypeScript** - Type-safe development
- **ElevenLabs Conversational AI** - Real-time voice agent
