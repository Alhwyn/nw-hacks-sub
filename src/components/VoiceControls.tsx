import React from 'react';
import { useConversation } from '../context/ConversationContext';
import { VoiceVisualizer } from './VoiceVisualizer';

export const VoiceControls: React.FC = () => {
  const { isCallActive, connectionStatus, startConversation, endConversation } = useConversation();
  const isConnecting = connectionStatus === 'connecting';

  return (
    <div className="bottom-controls">
      <VoiceVisualizer />

      {!isCallActive ? (
        <button 
          id="call-btn" 
          className={`voice-btn ${isConnecting ? 'loading' : ''}`}
          onClick={startConversation} 
          disabled={isConnecting}
          title={isConnecting ? 'Connecting...' : 'Start voice conversation'}
        >
          {isConnecting ? (
            <svg className="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg className="phone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          )}
        </button>
      ) : (
        <button id="end-call-btn" className="voice-btn end-call" onClick={endConversation} title="End conversation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
};
