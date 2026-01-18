import React from 'react';
import { useConversation } from '../context/ConversationContext';

export const Titlebar: React.FC = () => {
  const { userRole, setUserRole } = useConversation();

  return (
    <div className="titlebar">
      <span className="titlebar-title">Granny Helper</span>
      <div className="role-selector">
        <button 
          className={userRole === 'grandma' ? 'active' : ''} 
          onClick={() => setUserRole('grandma')}
        >
          Grandma
        </button>
        <button 
          className={userRole === 'grandson' ? 'active' : ''} 
          onClick={() => setUserRole('grandson')}
        >
          Grandson
        </button>
      </div>
    </div>
  );
};
