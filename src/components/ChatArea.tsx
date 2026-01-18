import React, { useEffect, useRef } from 'react';
import { useConversation } from '../context/ConversationContext';
import { MessageBubble } from './MessageBubble';

export const ChatArea: React.FC = () => {
  const { messages } = useConversation();
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={chatAreaRef} id="chat-area" className="chat-area">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
};
