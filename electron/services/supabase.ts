import { createClient } from '@supabase/supabase-js';
import { Memory, RelationshipNudge, UserRole } from '../types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('Supabase credentials missing. Persistent memory will be disabled.');
}

/**
 * Save a new memory extract from a conversation
 */
export async function saveMemory(memory: Omit<Memory, 'id' | 'timestamp'>) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('memories')
    .insert([
      {
        user_id: memory.userId,
        content: memory.content,
        category: memory.category,
        metadata: memory.metadata,
        timestamp: new Date().toISOString(),
      }
    ])
    .select();

  if (error) {
    console.error('Error saving memory:', error);
    return null;
  }
  return data?.[0];
}

/**
 * Fetch the most recent memories for a specific user role
 */
export async function getRecentMemories(userId: UserRole, limit = 5) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
  return data || [];
}

/**
 * Trigger a nudge for the other party
 */
export async function sendNudge(nudge: Omit<RelationshipNudge, 'id' | 'timestamp' | 'status'>) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('nudges')
    .insert([
      {
        type: nudge.type,
        title: nudge.title,
        message: nudge.message,
        context: nudge.context,
        status: 'pending',
        timestamp: new Date().toISOString(),
      }
    ])
    .select();

  if (error) {
    console.error('Error sending nudge:', error);
    return null;
  }
  return data?.[0];
}
