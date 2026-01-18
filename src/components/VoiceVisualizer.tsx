import React from 'react';
import { useConversation } from '../context/ConversationContext';

export const VoiceVisualizer: React.FC = () => {
  const { statusText, connectionStatus } = useConversation();

  if (statusText == "Ended" || statusText == "Connecting") {
    return null;
  }

  const className = `voice-visualizer ${connectionStatus === 'speaking' ? 'speaking' : ''} ${connectionStatus === 'listening' ? 'listening' : ''}`;

  return (
    <div id="voice-visualizer" className={className}>
      <div className="bar"></div>
      <div className="bar"></div>
      <div className="bar"></div>
      <div className="bar"></div>
      <div className="bar"></div>
    </div>
  );
};
