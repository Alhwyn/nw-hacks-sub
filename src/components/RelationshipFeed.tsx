import React, { useEffect, useState } from 'react';
import { useConversation } from '../context/ConversationContext';
import { Memory } from '../types';

export const RelationshipFeed: React.FC = () => {
  const { userRole } = useConversation();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const targetRole = userRole === 'grandma' ? 'grandson' : 'grandma';
      const data = await window.electronAPI.supabase.getRecentMemories(targetRole, 5);
      setMemories(data);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMemories, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  if (memories.length === 0 && !loading) return null;

  return (
    <div className="relationship-feed">
      <div className="feed-header">
        <h3>{userRole === 'grandma' ? "From your Grandson" : "From Grandma"}</h3>
        <button onClick={fetchMemories} disabled={loading}>Refresh</button>
      </div>
      <div className="feed-content">
        {loading && <p>Loading updates...</p>}
        {memories.map((memory) => (
          <div key={memory.id} className="memory-card">
            <span className="memory-time">{new Date(memory.timestamp).toLocaleDateString()}</span>
            <p className="memory-text">{memory.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
