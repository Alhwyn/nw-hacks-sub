export type UserRole = 'grandma' | 'grandson';

export interface Memory {
  id: string;
  userId: UserRole;
  content: string;
  category: 'milestone' | 'health' | 'struggle' | 'daily_update';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RelationshipNudge {
  id: string;
  type: 'alert' | 'update';
  title: string;
  message: string;
  context: string;
  timestamp: Date;
  status: 'pending' | 'delivered' | 'read';
}
