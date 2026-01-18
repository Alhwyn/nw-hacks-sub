// Renderer process - Voice conversation with ElevenLabs Conversational AI
import { Conversation } from '@11labs/client';

declare global {
  interface Window {
    electronAPI: {
      conversation: {
        getSignedUrl: () => Promise<string>;
        getConfig: () => Promise<{
          voiceId: string;
          systemPrompt: string;
          firstMessage: string;
        }>;
      };
    };
  }
}

let conversation: Conversation | null = null;
let isCallActive = false;

document.addEventListener('DOMContentLoaded', () => {
  const api = window.electronAPI;
  const callBtn = document.getElementById('call-btn')!;
  const endCallBtn = document.getElementById('end-call-btn')!;
  const statusText = document.getElementById('status-text')!;
  const connectionStatus = document.getElementById('connection-status')!;
  const transcriptContainer = document.getElementById('transcript-container')!;
  const transcriptMessages = document.getElementById('transcript-messages')!;

  // Auto-start conversation when app opens
  console.log('🚀 Voice conversation UI initialized');
  setTimeout(() => {
    console.log('⏰ Auto-start timer triggered');
    if (!isCallActive) {
      console.log('▶️ Starting conversation...');
      startConversation();
    }
  }, 500);

  // Start conversation
  async function startConversation() {
    if (isCallActive) {
      console.log('⚠️ Conversation already active, skipping');
      return;
    }

    try {
      console.log('🔄 Starting conversation flow...');
      updateStatus('connecting', 'Connecting...');
      callBtn.style.display = 'none';
      
      console.log('📡 Requesting signed URL from main process...');
      const signedUrl = await api.conversation.getSignedUrl();
      console.log('✅ Signed URL received:', signedUrl.substring(0, 50) + '...');
      
      console.log('⚙️ Getting conversation config...');
      const config = await api.conversation.getConfig();
      console.log('✅ Config received:', { 
        hasVoiceId: !!config.voiceId,
        hasPrompt: !!config.systemPrompt,
        hasFirstMessage: !!config.firstMessage 
      });
      
      console.log('🎙️ Starting ElevenLabs conversation session...');
      
      const overrides: any = {
        agent: {
          prompt: {
            prompt: config.systemPrompt,
          },
          firstMessage: config.firstMessage,
        },
      };
      
      // Only override voice if VOICE_ID is provided
      if (config.voiceId) {
        overrides.tts = { voiceId: config.voiceId };
      }

      conversation = await Conversation.startSession({
        signedUrl,
        overrides,
        onConnect: () => {
          console.log('✅ Connected to ElevenLabs conversation!');
          isCallActive = true;
          updateStatus('connected', 'Connected');
          endCallBtn.style.display = 'block';
          transcriptContainer.style.display = 'block';
        },
        onDisconnect: () => {
          console.log('🔌 Disconnected from conversation');
          isCallActive = false;
          updateStatus('disconnected', 'Call ended');
          callBtn.style.display = 'flex';
          endCallBtn.style.display = 'none';
        },
        onMessage: (message) => {
          console.log('💬 Message received:', message);
          handleMessage(message);
        },
        onError: (error) => {
          console.error('❌ Conversation error:', error);
          updateStatus('error', 'Connection error');
          isCallActive = false;
          callBtn.style.display = 'flex';
          endCallBtn.style.display = 'none';
        },
        onModeChange: (modeChange) => {
          console.log('🔄 Mode changed:', modeChange.mode);
          handleModeChange(modeChange.mode);
        },
      });

      console.log('✅ Conversation session initialized successfully');
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      console.error('Error details:', error);
      updateStatus('error', `Error: ${error}`);
      callBtn.style.display = 'flex';
      endCallBtn.style.display = 'none';
    }
  }

  // End conversation
  async function endConversation() {
    if (conversation) {
      try {
        await conversation.endSession();
        conversation = null;
        isCallActive = false;
        updateStatus('disconnected', 'Call ended');
        callBtn.style.display = 'flex';
        endCallBtn.style.display = 'none';
      } catch (error) {
        console.error('Error ending conversation:', error);
      }
    }
  }

  // Update status display
  function updateStatus(state: string, text: string) {
    statusText.textContent = text;
    connectionStatus.className = `connection-status ${state}`;
  }

  // Handle mode changes (speaking/listening)
  function handleModeChange(mode: string) {
    switch (mode) {
      case 'speaking':
        updateStatus('speaking', 'Speaking...');
        break;
      case 'listening':
        updateStatus('listening', 'Listening...');
        break;
      case 'thinking':
        updateStatus('thinking', 'Thinking...');
        break;
      default:
        updateStatus('connected', 'Connected');
    }
  }

  // Handle incoming messages
  function handleMessage(message: any) {
    const role = message.source || message.role || 'unknown';
    const text = message.message || message.text || '';
    
    if (!text) return;

    const messageEl = document.createElement('div');
    messageEl.className = `transcript-message ${role}`;
    
    const labelEl = document.createElement('div');
    labelEl.className = 'message-label';
    labelEl.textContent = role === 'user' ? 'You' : 'Granny\'s Helper';
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = text;
    
    messageEl.appendChild(labelEl);
    messageEl.appendChild(contentEl);
    transcriptMessages.appendChild(messageEl);
    
    // Scroll to bottom
    transcriptMessages.scrollTop = transcriptMessages.scrollHeight;
  }

  // Event listeners
  callBtn.addEventListener('click', startConversation);
  endCallBtn.addEventListener('click', endConversation);

  console.log('Voice conversation UI initialized');
});

export {};
