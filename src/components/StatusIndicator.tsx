import React from 'react';
import { useConversation } from '../context/ConversationContext';

export const StatusIndicator: React.FC = () => {
  const { connectionStatus, statusText } = useConversation();

  return (
    <div id="connection-status" className={`status-indicator ${connectionStatus}`}>
      <div className="status-dot"></div>
      <span id="status-text">{statusText}</span>
    </div>
  );
};
