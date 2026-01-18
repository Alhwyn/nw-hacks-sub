import React, { useEffect, useState } from 'react';
import { ConversationProvider, useConversation } from './context/ConversationContext';
import { Titlebar } from './components/Titlebar';
import { StatusIndicator } from './components/StatusIndicator';
import { ChatArea } from './components/ChatArea';
import { VoiceControls } from './components/VoiceControls';
import { getElectronAPI } from './types';
import { Settings } from './components/Settings';
import './styles.css';

const AppContent: React.FC = () => {
  const { startConversation, addMessage, isCallActive } = useConversation();
  const [showSettings, setShowSettings] = useState(false);
  const [agentName, setAgentName] = useState('Granny'); // Add this
  const [fontSize, setFontSize] = useState(20); // Add this

  useEffect(() => {
  // Load settings from localStorage
  const savedName = localStorage.getItem('agentName');
  const savedFontSize = localStorage.getItem('fontSize');
  
  if (savedName) setAgentName(savedName);
  
  const size = savedFontSize ? parseInt(savedFontSize) : 20;
  setFontSize(size);
  document.documentElement.style.setProperty('--message-font-size', `${size}px`);
}, []);

  const handleNameChange = (name: string) => {
    setAgentName(name);
    localStorage.setItem('agentName', name);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size.toString());
    // Update CSS variable
    document.documentElement.style.setProperty('--message-font-size', `${size}px`);
  };


  useEffect(() => {
    let hasStarted = false;

    // Check screen permission on startup
    const checkPermissions = async () => {
      try {
        const api = getElectronAPI();
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

  if (showSettings) {
        return (
      <>
        <Titlebar />
        <button 
          className="back-button"
          onClick={() => setShowSettings(false)}
        >
          ← Back
        </button>
        <Settings 
        onNameChange={handleNameChange}
        onFontSizeChange={handleFontSizeChange}
        currentName={agentName}
        currentFontSize={fontSize}
      />
      </>
    );
  }

  return (
    <>
      <Titlebar />
      <StatusIndicator />
      <div className="app-container">
        <ChatArea />
      </div>
      
      <div className='bottom-controls'>
        <button 
        className="settings-button"
        onClick={() => setShowSettings(true)}
        title="Settings"
      >
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
        </button>
        <VoiceControls />
      </div>
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
