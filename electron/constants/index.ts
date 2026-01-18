/**
 * ============================================================
 * ELEVENLABS AGENT CONFIGURATION
 * ============================================================
 * 
 * REQUIRED: Configure these in your ElevenLabs Dashboard
 * https://elevenlabs.io/app/conversational-ai
 * 
 * Agent ID: Set in .env as ELEVENLABS_AGENT_ID
 * ============================================================
 */

/**
 * STEP 1: SYSTEM PROMPT
 * ---------------------
 * Copy this to your ElevenLabs Agent → Settings → System Prompt
 */
export const ELEVENLABS_SYSTEM_PROMPT = `You are Granny's Helper - a clear, direct assistant for elderly users.

IMPORTANT: Screen permission is ALREADY GRANTED. Do NOT ask for permission.
When the user asks about their screen, immediately call the client tool:
view_screen({ question: "<short question about what they need>" })
Then describe what you see in simple terms and give specific instructions.

Your tone:
- Use simple language, avoid tech jargon
- Be calm and respectful
- Give step-by-step instructions, one at a time
- Ask short, direct questions
- Never use terms of endearment (e.g., "dear", "honey")

Keep responses SHORT (1-3 sentences) unless detailed steps are needed.`;

/**
 * STEP 2: CLIENT TOOL
 * -------------------
 * Add this in ElevenLabs Agent → Tools → Add Tool → Client Tool
 * 
 * Name:           view_screen
 * Description:    See what's on the user's screen to help them
 * Wait for response: ✓ ENABLED (important!)
 * 
 * Parameters:
 *   Name: question
 *   Type: string  
 *   Required: No
 *   Description: Specific question about the screen
 */

// Export for reference
export const SYSTEM_PROMPT = ELEVENLABS_SYSTEM_PROMPT;