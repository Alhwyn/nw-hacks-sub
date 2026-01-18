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
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_AGENT_ID=your_agent_id_here
VOICE_ID=your_voice_id_here  # Optional - uses dashboard voice if not set
```

**How to get these values:**

1. **ELEVENLABS_API_KEY**: Get from [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
2. **ELEVENLABS_AGENT_ID**: 
   - Go to [elevenlabs.io/conversational-ai](https://elevenlabs.io/conversational-ai)
   - Click "Create Agent" 
   - Copy the agent ID from the URL or settings
3. **VOICE_ID** (optional): 
   - If you want to override the voice set in your agent dashboard
   - Get voice ID from [elevenlabs.io/voices](https://elevenlabs.io/voices)
   - Leave empty to use the voice configured in your agent

### 3. Build and Run

```bash
# Build TypeScript files
bun run build

# Start the app
bun run start

# Or for development
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
