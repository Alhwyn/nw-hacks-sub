import React from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { role, content } = message;
  const isUser = role === 'user';
  const isSystem = role === 'system';
  
  const messageClass = isSystem ? 'system' : isUser ? 'user' : 'agent';
  const label = isUser ? 'You' : isSystem ? 'System' : "Granny's Helper";

  return (
    <div className={`message-row ${messageClass}`}>
      <div className={`message-bubble ${isSystem ? 'system-message' : ''}`}>
        <div className="message-label">{label}</div>
        <div className="message-content">{content}</div>
      </div>
    </div>
  );
};
