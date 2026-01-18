import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { Conversation } from '@11labs/client';
import { Message, ConnectionStatus, ConversationMode, UserRole } from '../types';

interface ConversationContextValue {
  // State
  userRole: UserRole;
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
  const [userRole, setUserRole] = useState<UserRole>('grandma');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [statusText, setStatusText] = useState('Disconnected');
  const [screenViewPermissionGranted, setScreenViewPermissionGranted] = useState(false);
  const [currentScreenContext, setCurrentScreenContext] = useState<string | null>(null);
  const [userEndedCall, setUserEndedCall] = useState(false);
  
  // Use refs for values that need to be accessed in closures
  const screenPermissionRef = useRef(false);
  const userEndedCallRef = useRef(false);
  const conversationRef = useRef<Conversation | null>(null);

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
    switch (mode) {
      case 'speaking':
        updateStatus('speaking', 'Speaking');
        break;
      case 'listening':
        updateStatus('listening', 'Listening');
        break;
      case 'thinking':
        updateStatus('thinking', 'Thinking');
        break;
      default:
        updateStatus('connected', 'Active');
    }
  }, [updateStatus]);

  const startConversation = useCallback(async () => {
    if (isCallActive) {
      console.log('Conversation already active, skipping');
      return;
    }

    try {
      console.log('=== STARTING CONVERSATION ===');
      setUserEndedCall(false);
      userEndedCallRef.current = false;
      updateStatus('connecting', 'Connecting');

      const api = window.electronAPI;
      
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
        // #region agent log
        fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'ConversationContext.tsx:114',message:'initial screen context captured',data:{hasContext:!!initialScreenContext,contextLength:initialScreenContext.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
      } catch (error) {
        console.error('Failed to capture initial screen:', error);
        // #region agent log
        fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'ConversationContext.tsx:118',message:'initial screen context capture failed',data:{error:true},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
      }

      const signedUrl = await api.conversation.getSignedUrl();
      const config = await api.conversation.getConfig();

      // Store screen context for the view_screen tool to use
      setCurrentScreenContext(initialScreenContext);

      // Build overrides - only voice, prompt must be configured in dashboard
      const overrides: any = {};
      
      if (config.voiceId) {
        overrides.tts = { voiceId: config.voiceId };
      }

      console.log('Starting conversation, initial screen context stored');

      const newConversation = await Conversation.startSession({
        signedUrl,
        ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
        // Client tools - handlers only, tool definitions must be in ElevenLabs dashboard
        clientTools: {
          view_screen: async (params: { question?: string }) => {
            console.log('=== TOOL CALL RECEIVED: view_screen ===');
            console.log('Tool params:', params);
            // #region agent log
            fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'ConversationContext.tsx:141',message:'view_screen tool called',data:{questionProvided:!!params.question,initialContextLength:initialScreenContext.length},timestamp:Date.now()})}).catch(()=>{});
            // #endregion agent log
            
            try {
              // If there's a specific question, capture fresh screen
              if (params.question) {
                const result = await api.vision.analyzeScreen(params.question);
                // #region agent log
                fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'ConversationContext.tsx:147',message:'view_screen returned from analyzeScreen',data:{resultLength:result.length,disabled:result.includes('disabled')},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
                console.log('=== TOOL CALL COMPLETED: view_screen (fresh) ===');
                return result;
              }
              
              // Otherwise use the pre-captured context if available, or capture new
              if (initialScreenContext) {
                console.log('Using pre-captured screen context');
                // #region agent log
                fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'ConversationContext.tsx:154',message:'view_screen returned cached context',data:{contextLength:initialScreenContext.length},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
                console.log('=== TOOL CALL COMPLETED: view_screen (cached) ===');
                return initialScreenContext;
              }
              
              const result = await api.vision.analyzeScreen();
              // #region agent log
              fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'ConversationContext.tsx:159',message:'view_screen returned from analyzeScreen fallback',data:{resultLength:result.length,disabled:result.includes('disabled')},timestamp:Date.now()})}).catch(()=>{});
              // #endregion agent log
              console.log('=== TOOL CALL COMPLETED: view_screen (fallback) ===');
              return result;
            } catch (error) {
              console.error('Error in view_screen tool:', error);
              console.log('=== TOOL CALL FAILED: view_screen ===');
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
        },
        // Handle tool calls for tools not registered locally
        onUnhandledClientToolCall: (toolCall) => {
          console.warn('=== UNHANDLED TOOL CALL ===', toolCall);
          // #region agent log
          fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H3',location:'ConversationContext.tsx:170',message:'unhandled tool call',data:{toolName:(toolCall as any)?.toolName || (toolCall as any)?.name},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log
        },
        onConnect: async () => {
          console.log('Connected to ElevenLabs conversation');
          console.log('Agent has initial screen context:', !!initialScreenContext);
          
          // Inject Relationship Context / Memories
          try {
            const targetRole = userRole === 'grandma' ? 'grandson' : 'grandma';
            const recentMemories = await api.supabase.getRecentMemories(targetRole, 3);
            
            if (recentMemories && recentMemories.length > 0) {
              const memoryContext = recentMemories
                .map((m: any) => `- ${m.content} (${new Date(m.timestamp).toLocaleDateString()})`)
                .join('\n');
              
              const systemMessage = `[SYSTEM_CONTEXT] Here is some recent context about your ${targetRole}:\n${memoryContext}\nUse this context to be a better companion and relationship co-pilot.`;
              
              if (typeof (newConversation as any).sendUserMessage === 'function') {
                (newConversation as any).sendUserMessage(systemMessage);
              }
            }
          } catch (error) {
            console.error('Failed to inject memory context:', error);
          }

          // #region agent log
          fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H3',location:'ConversationContext.tsx:196',message:'conversation connected',data:{hasScreenContext:!!initialScreenContext,screenContextLength:initialScreenContext.length},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log
          setIsCallActive(true);
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
          const role = message.source || message.role || 'unknown';
          const text = message.message || message.text || '';
          // #region agent log
          fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H5',location:'ConversationContext.tsx:193',message:'onMessage received',data:{role,hasText:!!text,mentionsTool:typeof text === 'string' && text.toLowerCase().includes('tool'),mentionsCannotSee:typeof text === 'string' && text.toLowerCase().includes("can't see")},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log
          
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
          
          // Only capture screen context occasionally, not on every listening event
          // This prevents performance issues and excessive API calls
          if (modeChange.mode === 'listening' && !currentScreenContext) {
            try {
              const context = await api.vision.captureAndDescribe();
              setCurrentScreenContext(context.description);
              if (typeof (conversationRef.current as any)?.sendUserMessage === 'function') {
                (conversationRef.current as any).sendUserMessage(
                  `[SCREEN_CONTEXT_UPDATE] ${context.description}`
                );
              }
            } catch (error) {
              console.error('Failed to capture screen context:', error);
              setCurrentScreenContext(null);
            }
          }
          
          handleModeChange(modeChange.mode);
        },
      });

      conversationRef.current = newConversation;
      setConversation(newConversation);

      // #region agent log
      fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'ConversationContext.tsx:257',message:'checking conversation methods',data:{hasSendUserMessage:typeof (newConversation as any).sendUserMessage === 'function',methods:Object.getOwnPropertyNames(Object.getPrototypeOf(newConversation))},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

      if (typeof (newConversation as any).sendUserMessage === 'function') {
        try {
          (newConversation as any).sendUserMessage(
            `[SYSTEM] Screen permission already granted. Do not ask for permission. When asked about the screen, immediately call view_screen({ question: "what should I help with?" }).`
          );
          (newConversation as any).sendUserMessage(
            `[SCREEN_CONTEXT] ${initialScreenContext || 'Unable to capture screen. Help the user verbally.'}`
          );
          // #region agent log
          fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H4',location:'ConversationContext.tsx:236',message:'sent system + screen context messages',data:{contextLength:initialScreenContext.length},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log
        } catch (error) {
          console.error('Failed to send screen context to agent:', error);
          // #region agent log
          fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'ConversationContext.tsx:278',message:'sendUserMessage threw error',data:{error:String(error)},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7254/ingest/9783cea7-141f-45fd-bc2e-dc110810f23f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'ConversationContext.tsx:283',message:'sendUserMessage NOT available on conversation object',data:{available:false},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      updateStatus('error', 'Error');
    }
  }, [isCallActive, updateStatus, addMessage, handleModeChange]);

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
        setUserEndedCall(true);
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
