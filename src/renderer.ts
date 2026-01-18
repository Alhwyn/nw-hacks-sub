// Renderer process - Voice conversation with ElevenLabs Conversational AI
// Note: This is legacy code. The React app in App.tsx/ConversationContext.tsx is now the main UI.
import { Conversation } from '@11labs/client';
import type { ElectronAPI } from './types';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

let conversation: Conversation | null = null;
let isCallActive = false;
let autoStartAttempted = false;
let userEndedCall = false; // Track if user manually ended the call
let currentScreenContext: string | null = null; // Store current screen description
let screenViewPermissionGranted = false; // Track if user granted permission to view screen

document.addEventListener('DOMContentLoaded', () => {
  console.log('=== DOMContentLoaded event fired ===');
  console.log('Timestamp:', new Date().toISOString());
  
  const api = window.electronAPI;
  const callBtn = document.getElementById('call-btn')!;
  const endCallBtn = document.getElementById('end-call-btn')!;
  const statusText = document.getElementById('status-text')!;
  const connectionStatus = document.getElementById('connection-status')!;
  const chatArea = document.getElementById('chat-area')!;
  const voiceVisualizer = document.getElementById('voice-visualizer')!;

  // Check and request screen recording permission
  async function checkScreenPermission(): Promise<boolean> {
    const status = await api.permission.getScreenStatus();
    console.log('Screen recording permission status:', status);
    
    if (status === 'granted') {
      return true;
    }
    
    console.log('Screen recording permission not granted, requesting...');
    const result = await api.permission.requestScreen();
    console.log('Permission request result:', result);
    
    if (result.status === 'granted') {
      return true;
    }
    
    // Show warning in chat area that screen features are limited
    const warningEl = document.createElement('div');
    warningEl.className = 'message-row system';
    warningEl.innerHTML = `
      <div class="message-bubble system-message">
        <div class="message-content">⚠️ Screen recording permission not granted. Screen sharing features will be limited.</div>
      </div>
    `;
    chatArea.appendChild(warningEl);
    
    return false;
  }

  // Verify AudioWorklet support
  console.log('Voice conversation UI initialized');
  console.log('AudioWorklet support check:');
  console.log('  - AudioWorklet available:', typeof AudioWorklet !== 'undefined');
  console.log('  - AudioContext available:', typeof AudioContext !== 'undefined');
  if (typeof AudioContext !== 'undefined') {
    const testContext = new AudioContext();
    console.log('  - audioContext.audioWorklet:', typeof testContext.audioWorklet !== 'undefined');
    testContext.close();
  }

  // Check permission and auto-start conversation when app opens
  setTimeout(async () => {
    console.log('Auto-start timer triggered');
    console.log('isCallActive:', isCallActive);
    console.log('autoStartAttempted:', autoStartAttempted);
    
    // Check screen permission first (optional - doesn't block conversation)
    await checkScreenPermission();
    
    if (!isCallActive && !autoStartAttempted) {
      console.log('Starting conversation...');
      autoStartAttempted = true;
      startConversation();
    } else {
      console.log('Conversation already active or auto-start already attempted, skipping');
    }
  }, 500);

  // Start conversation
  async function startConversation() {
    if (isCallActive) {
      console.log('Conversation already active, skipping');
      return;
    }

    try {
      console.log('=== STARTING CONVERSATION ===');
      console.log('Timestamp:', new Date().toISOString());
      userEndedCall = false; // Reset flag for new conversation
      updateStatus('connecting', 'Connecting');
      callBtn.style.display = 'none';
      
      console.log('Requesting signed URL from main process...');
      const signedUrl = await api.conversation.getSignedUrl();
      console.log('Signed URL received:', signedUrl.substring(0, 50) + '...');
      
      console.log('Getting conversation config...');
      const config = await api.conversation.getConfig();
      console.log('Config received:', { hasVoiceId: !!config.voiceId });
      
      console.log('Starting ElevenLabs conversation session...');
      
      // Only override voice if VOICE_ID is explicitly provided in .env
      // Agent prompt and first message are configured in the ElevenLabs dashboard
      const overrides: any = {};
      
      if (config.voiceId) {
        console.log('Overriding voice with:', config.voiceId);
        overrides.tts = { voiceId: config.voiceId };
      } else {
        console.log('Using agent default voice from dashboard');
      }

      conversation = await Conversation.startSession({
        signedUrl,
        ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
        clientTools: {
          request_screen_permission: {
            description: 'Ask the user for permission to view their screen. Must be called before using view_screen. Returns whether permission was granted. Always explain why you need to see the screen.',
            parameters: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: 'Brief, friendly explanation of why you need to see the screen to help them',
                },
              },
              required: ['reason'],
            },
            handler: async (params: { reason?: string }) => {
              console.log('Client tool request_screen_permission called with:', params);
              
              return new Promise<string>((resolve) => {
                const modal = document.getElementById('screen-permission-modal')!;
                const reasonText = document.getElementById('permission-reason')!;
                const allowBtn = document.getElementById('permission-allow')!;
                const denyBtn = document.getElementById('permission-deny')!;
                
                // Set the reason text
                const reason = params.reason || 'The assistant wants to see your screen to help you better.';
                reasonText.textContent = reason;
                
                // Show modal
                modal.classList.remove('hidden');
                
                // Handle allow
                const handleAllow = () => {
                  screenViewPermissionGranted = true;
                  modal.classList.add('hidden');
                  allowBtn.removeEventListener('click', handleAllow);
                  denyBtn.removeEventListener('click', handleDeny);
                  console.log('Screen permission granted by user');
                  resolve('Permission granted. You can now use view_screen to see what is on the user\'s screen.');
                };
                
                // Handle deny
                const handleDeny = () => {
                  screenViewPermissionGranted = false;
                  modal.classList.add('hidden');
                  allowBtn.removeEventListener('click', handleAllow);
                  denyBtn.removeEventListener('click', handleDeny);
                  console.log('Screen permission denied by user');
                  resolve('Permission denied. The user does not want you to view their screen right now. Continue helping them without screen access.');
                };
                
                allowBtn.addEventListener('click', handleAllow);
                denyBtn.addEventListener('click', handleDeny);
              });
            },
          },
          view_screen: {
            description: 'View and analyze what is currently on the user\'s screen. REQUIRES permission from request_screen_permission first. Use this to see applications, windows, content, and UI elements visible on screen.',
            parameters: {
              type: 'object',
              properties: {
                question: {
                  type: 'string',
                  description: 'Optional specific question about what you want to know about the screen',
                },
              },
            },
            handler: async (params: { question?: string }) => {
              console.log('Client tool view_screen called with:', params);
              
              if (!screenViewPermissionGranted) {
                console.log('Screen permission not granted, denying view_screen request');
                return 'Permission denied. You must call request_screen_permission first and receive user approval before you can view their screen.';
              }
              
              try {
                const result = await api.vision.analyzeScreen(params.question);
                console.log('Screen analysis result:', result.substring(0, 100) + '...');
                return result;
              } catch (error) {
                console.error('Error in view_screen tool:', error);
                return 'Unable to analyze screen at this moment.';
              }
            },
          },
        },
        onConnect: () => {
          console.log('Connected to ElevenLabs conversation');
          isCallActive = true;
          updateStatus('connected', 'Active');
          endCallBtn.style.display = 'flex';
          callBtn.style.display = 'none';
          voiceVisualizer.style.display = 'flex';
        },
        onDisconnect: (disconnectReason) => {
          console.log('=== DISCONNECTED ===');
          console.log('Disconnect reason:', JSON.stringify(disconnectReason, null, 2));
          console.log('User ended call:', userEndedCall);
          console.log('Was call active:', isCallActive);
          
          isCallActive = false;
          conversation = null;
          currentScreenContext = null;
          screenViewPermissionGranted = false; // Reset permission on disconnect
          
          if (userEndedCall) {
            updateStatus('disconnected', 'Ended');
          } else {
            // Unexpected disconnect
            console.warn('Unexpected disconnect - not user initiated');
            updateStatus('error', 'Disconnected');
          }
          
          callBtn.style.display = 'flex';
          endCallBtn.style.display = 'none';
          voiceVisualizer.style.display = 'none';
        },
        onMessage: (message) => {
          console.log('Message received:', message);
          handleMessage(message);
        },
        onError: (error) => {
          console.error('Conversation error:', error);
          updateStatus('error', 'Error');
          isCallActive = false;
          callBtn.style.display = 'flex';
          endCallBtn.style.display = 'none';
          voiceVisualizer.style.display = 'none';
        },
        onModeChange: async (modeChange) => {
          console.log('Mode changed:', modeChange.mode);
          
          // Auto-capture screen when user starts speaking
          if (modeChange.mode === 'listening') {
            console.log('User started speaking - capturing screen context');
            try {
              const context = await api.vision.captureAndDescribe();
              currentScreenContext = context.description;
              console.log('Screen context captured:', currentScreenContext.substring(0, 100) + '...');
            } catch (error) {
              console.error('Failed to capture screen context:', error);
              currentScreenContext = null;
            }
          }
          
          handleModeChange(modeChange.mode);
        },
      });

      console.log('Conversation session initialized successfully');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      console.error('Error details:', error);
      
      // Check if it's an AudioWorklet error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('worklet') || errorMessage.includes('AudioWorklet')) {
        console.error('AudioWorklet Error Detected');
        console.error('   This usually means:');
        console.error('   1. Browser/Electron context does not support AudioWorklet');
        console.error('   2. Worklet module failed to load (CSP, file path, or sandbox issue)');
        console.error('   3. Check if sandbox is disabled in webPreferences');
        updateStatus('error', 'Audio Error');
      } else {
        updateStatus('error', 'Error');
      }
      
      callBtn.style.display = 'flex';
      endCallBtn.style.display = 'none';
      voiceVisualizer.style.display = 'none';
    }
  }

  // End conversation
  async function endConversation() {
    if (conversation) {
      try {
        userEndedCall = true; // Mark as user-initiated
        await conversation.endSession();
        conversation = null;
        isCallActive = false;
        screenViewPermissionGranted = false; // Reset permission on end
        updateStatus('disconnected', 'Ended');
        callBtn.style.display = 'flex';
        endCallBtn.style.display = 'none';
        voiceVisualizer.style.display = 'none';
      } catch (error) {
        console.error('Error ending conversation:', error);
      }
    }
  }

  // Update status display
  function updateStatus(state: string, text: string) {
    statusText.textContent = text;
    connectionStatus.className = `status-indicator ${state}`;
  }

  // Handle mode changes (speaking/listening)
  function handleModeChange(mode: string) {
    // Update visualizer state
    voiceVisualizer.className = 'voice-visualizer';
    
    switch (mode) {
      case 'speaking':
        updateStatus('speaking', 'Speaking');
        voiceVisualizer.style.display = 'flex';
        voiceVisualizer.classList.add('speaking');
        break;
      case 'listening':
        updateStatus('listening', 'Listening');
        voiceVisualizer.style.display = 'flex';
        voiceVisualizer.classList.add('listening');
        break;
      case 'thinking':
        updateStatus('thinking', 'Thinking');
        voiceVisualizer.style.display = 'none';
        break;
      default:
        updateStatus('connected', 'Active');
        voiceVisualizer.style.display = 'none';
    }
  }

  // Handle incoming messages
  function handleMessage(message: any) {
    const role = message.source || message.role || 'unknown';
    const text = message.message || message.text || '';
    
    if (!text) return;

    // Determine if user or agent message
    const isUser = role === 'user';
    const messageClass = isUser ? 'user' : 'agent';

    // Create message row (for positioning left/right)
    const rowEl = document.createElement('div');
    rowEl.className = `message-row ${messageClass}`;
    
    // Create message bubble
    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'message-bubble';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'message-label';
    labelEl.textContent = isUser ? 'You' : 'Granny\'s Helper';
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = text;
    
    bubbleEl.appendChild(labelEl);
    bubbleEl.appendChild(contentEl);
    rowEl.appendChild(bubbleEl);
    chatArea.appendChild(rowEl);
    
    // Scroll to bottom
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // Event listeners
  callBtn.addEventListener('click', startConversation);
  endCallBtn.addEventListener('click', endConversation);

  console.log('Voice conversation UI initialized');
});

export {};
