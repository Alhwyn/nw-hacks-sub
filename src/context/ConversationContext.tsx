import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { Conversation } from '@11labs/client';
import type { Message, ConnectionStatus, ConversationMode } from '../types';
import { getElectronAPI } from '../types';

interface ConversationContextValue {
  conversation: Conversation | null;
  isCallActive: boolean;
  messages: Message[];
  connectionStatus: ConnectionStatus;
  statusText: string;
  screenViewPermissionGranted: boolean;
  currentScreenContext: string | null;
  
  // Actions
  setUserRole: (role: UserRole) => void;
  startConversation: () => Promise<void>;
  endConversation: () => Promise<void>;
  interruptAgent: () => void;
  addMessage: (role: 'user' | 'agent' | 'system', content: string) => void;
  updateStatus: (status: ConnectionStatus, text: string) => void;
  setScreenViewPermission: (granted: boolean) => void;
  handleModeChange: (mode: ConversationMode) => void;
}

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

interface ConversationProviderProps {
  children: ReactNode;
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const [conversation, setConversation]                               = useState<Conversation | null>(null);
  const [isCallActive, setIsCallActive]                               = useState(false);
  const [messages, setMessages]                                       = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus]                       = useState<ConnectionStatus>('disconnected');
  const [statusText, setStatusText]                                   = useState('Disconnected');
  const [screenViewPermissionGranted, setScreenViewPermissionGranted] = useState(false);
  const [currentScreenContext, setCurrentScreenContext]               = useState<string | null>(null);
  
  const screenPermissionRef = useRef(false);
  const userEndedCallRef    = useRef(false);
  const conversationRef     = useRef<Conversation | null>(null);  

  const addMessage = useCallback((role: 'user' | 'agent' | 'system', content: string) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const updateStatus = useCallback((status: ConnectionStatus, text: string) => {
    setConnectionStatus(status);
    setStatusText(text);
  }, []);

  const setScreenViewPermission = useCallback((granted: boolean) => {
    screenPermissionRef.current = granted;
    setScreenViewPermissionGranted(granted);
  }, []);

  const handleModeChange = useCallback((mode: ConversationMode) => {
    const api = getElectronAPI();
    
    switch (mode) {
      case 'speaking':
        updateStatus('speaking', 'Speaking');
        // Move window back when agent is speaking
        api.window?.moveBack();
        break;
      case 'listening':
        updateStatus('listening', 'Listening');
        // Move window to corner when user is talking
        api.window?.moveToCorner();
        break;
      case 'thinking':
        updateStatus('thinking', 'Thinking');
        // Move window back when agent is thinking
        api.window?.moveBack();
        break;
      default:
        updateStatus('connected', 'Active');
    }
  }, [updateStatus]);

  const startConversation = useCallback(async () => {
    if (isCallActive || connectionStatus === 'connecting') {
      console.log('Conversation already active or connecting, skipping');
      return;
    }

    try {
      console.log('=== STARTING CONVERSATION ===');
      userEndedCallRef.current = false;
      setIsCallActive(true); // Set immediately to prevent duplicate clicks
      updateStatus('connecting', 'Connecting');

      const api = getElectronAPI();
      
      // Treat screen permission as granted for this session
      screenPermissionRef.current = true;
      setScreenViewPermissionGranted(true);

      // Capture screen context BEFORE starting conversation
      let initialScreenContext = '';
      try {
        console.log('Capturing initial screen context...');
        const context = await api.vision.captureAndDescribe();
        initialScreenContext = context.description;
        console.log('Initial screen context:', initialScreenContext);
      } catch (error) {
        console.error('Failed to capture initial screen:', error);
      }

      const signedUrl = await api.conversation.getSignedUrl();
      const config = await api.conversation.getConfig();

      // Store screen context for the view_screen tool to use
      setCurrentScreenContext(initialScreenContext);

      // Build overrides - only voice, prompt must be configured in dashboard
      const overrides: any = {};
      
      if (config.voiceId) {
        overrides.tts = { 
          voiceId: config.voiceId,
          optimize_streaming_latency: 3, // 1-4, higher = more aggressive optimization
        };
      } else {
        overrides.tts = {
          optimize_streaming_latency: 3,
        };
      }

      console.log('Starting conversation, initial screen context stored');

      const newConversation = await Conversation.startSession({
        signedUrl,
        // Note: WebRTC support coming in future SDK versions; currently using WebSocket
        ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
        // Client tools - handlers only, tool definitions must be in ElevenLabs dashboard
        clientTools: {
          view_screen: async (params: { question?: string }) => {
            console.log('view_screen tool called');
            
            try {
              // If there's a specific question, capture fresh screen
              if (params.question) {
                const result = await api.vision.analyzeScreen(params.question);
                return result;
              }
              
              // Otherwise use the pre-captured context if available, or capture new
              if (initialScreenContext) {
                console.log('Using pre-captured screen context');
                return initialScreenContext;
              }
              
              const result = await api.vision.analyzeScreen();
              return result;
            } catch (error) {
              console.error('Error in view_screen tool:', error);
              return 'Unable to analyze screen at this moment.';
            }
          },
          trigger_relationship_nudge: async (params: { type: 'alert' | 'update', title: string, message: string, context: string }) => {
            console.log('=== TOOL CALL RECEIVED: trigger_relationship_nudge ===');
            console.log('Tool params:', params);
            try {
              const result = await api.supabase.sendNudge({
                type: params.type,
                title: params.title,
                message: params.message,
                context: params.context
              });
              console.log('=== TOOL CALL COMPLETED: trigger_relationship_nudge ===', result);
              return 'Notification sent successfully to your grandson.';
            } catch (error) {
              console.error('Error in trigger_relationship_nudge tool:', error);
              return 'Failed to send notification.';
            }
          }
          
          find_and_highlight: async (params: { element: string }) => {
            console.log('find_and_highlight tool called for:', params.element);
            
            try {
              const result = await api.highlight?.findAndShow(params.element);
              
              if (result?.found) {
                return `Found and highlighted "${params.element}". Look for the highlighted box on your screen.`;
              } else {
                return `Could not find "${params.element}" on the screen. ${result?.message || ''}`;
              }
            } catch (error) {
              console.error('Error in find_and_highlight:', error);
              return `Failed to find element: ${error}`;
            }
          },
          
          clear_highlight: async () => {
            try {
              await api.highlight?.clear();
              return 'Highlight cleared.';
            } catch (error) {
              console.error('Error clearing highlight:', error);
              return `Failed to clear highlight: ${error}`;
            }
          },
          
          launch_app: async (params: { app: string }) => {
            console.log('launch_app tool called for:', params.app);
            
            try {
              const result = await api.system?.launchApp(params.app);
              return result?.message || `Launched ${params.app}`;
            } catch (error) {
              console.error('Error launching app:', error);
              return `Failed to launch ${params.app}: ${error}`;
            }
          },
          
          system_command: async (params: { command: string }) => {
            console.log('system_command tool called');
            
            try {
              const result = await api.system?.execute(params.command);
              return result?.output || 'Command executed';
            } catch (error) {
              console.error('Error executing command:', error);
              return `Failed to execute command: ${error}`;
            }
          },
        },
        // Handle tool calls for tools not registered locally
        onUnhandledClientToolCall: (toolCall) => {
          console.warn('Unhandled tool call:', toolCall);
        },
        onConnect: async () => {
          console.log('Connected to ElevenLabs conversation');
          updateStatus('connected', 'Active');
        },
        onDisconnect: (disconnectReason) => {
          console.log('=== DISCONNECTED ===', disconnectReason);
          setIsCallActive(false);
          setConversation(null);
          setCurrentScreenContext(null);
          setScreenViewPermissionGranted(false);
          screenPermissionRef.current = false;
          
          if (userEndedCallRef.current) {
            updateStatus('disconnected', 'Ended');
          } else {
            updateStatus('error', 'Disconnected');
          }
        },
        onMessage: (message) => {
          const role = message.source || (message as any).role || 'unknown';
          const text = message.message || (message as any).text || '';
          
          if (text) {
            const isUser = role === 'user';
            addMessage(isUser ? 'user' : 'agent', text);
          }
        },
        onError: (error) => {
          console.error('Conversation error:', error);
          updateStatus('error', 'Error');
          setIsCallActive(false);
        },
        onModeChange: async (modeChange) => {
          console.log('Mode changed:', modeChange.mode);
          
          // Just update the UI status, don't send messages or capture screen
          // This prevents the agent from getting into a loop
          handleModeChange(modeChange.mode);
        },
      });

      conversationRef.current = newConversation;
      setConversation(newConversation);

      console.log('Conversation started, waiting for user input...');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setIsCallActive(false); // Reset on error
      updateStatus('error', 'Error');
    }
  }, [isCallActive, connectionStatus, updateStatus, addMessage, handleModeChange]);

  const interruptAgent = useCallback(() => {
    if (conversation) {
      try {
        console.log('Interrupting agent...');
        // Force the conversation back to listening mode by calling the interrupt method if available
        if (typeof (conversation as any).interrupt === 'function') {
          (conversation as any).interrupt();
        }
        updateStatus('listening', 'Listening');
      } catch (error) {
        console.error('Error interrupting agent:', error);
      }
    }
  }, [conversation, updateStatus]);

  const endConversation = useCallback(async () => {
    if (conversation) {
      try {
        console.log('Ending conversation...');
        userEndedCallRef.current = true;
        
        // Extract memories before ending session if we have messages
        if (messages.length > 2) {
          const api = window.electronAPI;
          const summary = await api.vision.summarizeConversation(
            messages.map(m => ({ role: m.role, content: m.content }))
          );
          
          if (summary && summary !== 'Nothing noteworthy.') {
            const memoryLines = summary.split('\n').filter(line => line.trim().length > 0);
            for (const line of memoryLines) {
              await api.supabase.saveMemory({
                userId: userRole,
                content: line,
                category: 'daily_update',
              });
            }
          }
        }

        await conversation.endSession();
        setConversation(null);
        setIsCallActive(false);
        setScreenViewPermissionGranted(false);
        screenPermissionRef.current = false;
        updateStatus('disconnected', 'Ended');
        console.log('Conversation ended successfully');
      } catch (error) {
        console.error('Error ending conversation:', error);
      }
    } else {
      console.log('No active conversation to end');
    }
  }, [conversation, messages, userRole, updateStatus]);

  const value: ConversationContextValue = {
    userRole,
    conversation,
    isCallActive,
    messages,
    connectionStatus,
    statusText,
    screenViewPermissionGranted,
    currentScreenContext,
    setUserRole,
    startConversation,
    endConversation,
    interruptAgent,
    addMessage,
    updateStatus,
    setScreenViewPermission,
    handleModeChange,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};
