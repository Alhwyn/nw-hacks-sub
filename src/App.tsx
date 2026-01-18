import React, { useEffect } from 'react';
import { ConversationProvider, useConversation } from './context/ConversationContext';
import { Titlebar } from './components/Titlebar';
import { StatusIndicator } from './components/StatusIndicator';
import { ChatArea } from './components/ChatArea';
import { VoiceControls } from './components/VoiceControls';
import './styles.css';

const AppContent: React.FC = () => {
  const { startConversation, addMessage, isCallActive } = useConversation();


  

  useEffect(() => {
    let hasStarted = false;

    // Check screen permission on startup
    const checkPermissions = async () => {
      try {
        const api = window.electronAPI;
        const screenStatus = await api.permission.getScreenStatus();
        console.log('Screen recording permission:', screenStatus);

        if (screenStatus !== 'granted') {
          addMessage('system', '⚠️ Screen recording permission not granted. Screen sharing features will be limited.');
        }
      } catch (error) {
        console.error('Failed to check permissions:', error);
      }
    };

    checkPermissions();

    // Auto-start conversation after a short delay (only once)
    const timer = setTimeout(() => {
      if (!hasStarted && !isCallActive) {
        console.log('Auto-starting conversation');
        hasStarted = true;
        startConversation();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      hasStarted = true; // Prevent re-run
    };
  }, []); // Empty dependency array - only run once on mount

  return (
    <>
      <Titlebar />
      <StatusIndicator />
      <div className="app-container">
        <ChatArea />
      </div>
      <VoiceControls />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ConversationProvider>
      <AppContent />
    </ConversationProvider>
  );
};
