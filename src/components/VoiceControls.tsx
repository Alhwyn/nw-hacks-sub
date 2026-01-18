import React from 'react';
import { useConversation } from '../context/ConversationContext';
import { VoiceVisualizer } from './VoiceVisualizer';

export const VoiceControls: React.FC = () => {
  const { isCallActive, startConversation, endConversation } = useConversation();

  return (
    <div className="bottom-controls">
      <VoiceVisualizer />

      {!isCallActive ? (
        <div className='btn-div'>
        <button id="call-btn" className="voice-btn bg-white" onClick={startConversation} title="Start voice conversation">
          <svg className="mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <h2>Tap to Speak</h2>
        </div>
      ) : (
          <div className='btn-div'>
        <button id="end-call-btn" className="voice-btn end-call" onClick={endConversation} title="End conversation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
            </button>
            <h2>Listening... Tap to stop</h2>
            </div>
      )}
      
    </div>
  );
};
