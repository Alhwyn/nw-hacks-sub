import React from 'react';
import { useConversation } from '../context/ConversationContext';

export const Titlebar: React.FC = () => {
  const { userRole, setUserRole } = useConversation();

  return (
<<<<<<< HEAD
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
=======
    <div className="titlebar bg-red">
      <span className="titlebar-title">Granny</span>
>>>>>>> fc66a1dca62c24cbf19696c84cd5785843e4ce7a
    </div>
  );
};
