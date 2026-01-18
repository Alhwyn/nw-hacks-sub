// Tools Configuration Service
// Defines and registers all tools available to the ElevenLabs agent

import * as calendar from './googleCalendar';
import * as gmail from './gmail';
import * as googleAuth from './googleAuth';

// Tool definitions that need to be configured in ElevenLabs Agent Dashboard
// Export these for reference when setting up the agent
export const TOOL_DEFINITIONS = {
  // Calendar Tools
  get_upcoming_events: {
    name: 'get_upcoming_events',
    description: 'Get upcoming events from the user\'s Google Calendar. Use this when the user asks about their schedule, upcoming appointments, or what\'s coming up.',
    parameters: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: 'Maximum number of events to return (default: 10)',
        },
      },
      required: [],
    },
  },
  get_today_agenda: {
    name: 'get_today_agenda',
    description: 'Get today\'s schedule and events. Use this when the user asks "what do I have today" or "what\'s on my agenda".',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  get_tomorrow_agenda: {
    name: 'get_tomorrow_agenda',
    description: 'Get tomorrow\'s schedule and events. Use this when the user asks about tomorrow.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  get_events_for_day: {
    name: 'get_events_for_day',
    description: 'Get events for a specific day. Use when user asks about a particular date.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date in YYYY-MM-DD format',
        },
      },
      required: ['date'],
    },
  },
  create_calendar_event: {
    name: 'create_calendar_event',
    description: 'Create a new calendar event. Use when user wants to add something to their calendar.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the event',
        },
        startDateTime: {
          type: 'string',
          description: 'Start date and time in ISO 8601 format',
        },
        endDateTime: {
          type: 'string',
          description: 'End date and time in ISO 8601 format (optional)',
        },
        location: {
          type: 'string',
          description: 'Location of the event (optional)',
        },
        description: {
          type: 'string',
          description: 'Description or notes for the event (optional)',
        },
      },
      required: ['title', 'startDateTime'],
    },
  },
  search_calendar_events: {
    name: 'search_calendar_events',
    description: 'Search for calendar events by keyword. Use when user wants to find specific events.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
        },
      },
      required: ['query'],
    },
  },

  // Gmail Tools
  get_recent_emails: {
    name: 'get_recent_emails',
    description: 'Get recent emails from the inbox. Use when user asks to check their email or see recent messages.',
    parameters: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: 'Maximum number of emails to return (default: 5)',
        },
        unreadOnly: {
          type: 'boolean',
          description: 'Only return unread emails',
        },
      },
      required: [],
    },
  },
  get_unread_count: {
    name: 'get_unread_count',
    description: 'Get the count of unread emails. Use when user asks "do I have any new emails" or "how many unread emails".',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  read_email: {
    name: 'read_email',
    description: 'Read the contents of a specific email. Use when user wants to hear an email read aloud.',
    parameters: {
      type: 'object',
      properties: {
        emailIndex: {
          type: 'number',
          description: 'The index of the email (1-based) from the recent emails list',
        },
      },
      required: ['emailIndex'],
    },
  },
  search_emails: {
    name: 'search_emails',
    description: 'Search for emails matching a query. Use when user wants to find specific emails.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (can include from:, subject:, etc.)',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results (default: 5)',
        },
      },
      required: ['query'],
    },
  },
  send_email: {
    name: 'send_email',
    description: 'Send an email to someone. Use when user wants to compose and send an email.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        subject: {
          type: 'string',
          description: 'Email subject',
        },
        body: {
          type: 'string',
          description: 'Email body content',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  reply_to_email: {
    name: 'reply_to_email',
    description: 'Reply to an existing email. Use when user wants to respond to an email.',
    parameters: {
      type: 'object',
      properties: {
        emailIndex: {
          type: 'number',
          description: 'The index of the email to reply to (1-based)',
        },
        replyBody: {
          type: 'string',
          description: 'The reply message content',
        },
      },
      required: ['emailIndex', 'replyBody'],
    },
  },
  get_emails_from_sender: {
    name: 'get_emails_from_sender',
    description: 'Get emails from a specific person. Use when user asks about emails from someone.',
    parameters: {
      type: 'object',
      properties: {
        senderName: {
          type: 'string',
          description: 'Name or email of the sender',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results (default: 5)',
        },
      },
      required: ['senderName'],
    },
  },

  // Authentication
  connect_google_account: {
    name: 'connect_google_account',
    description: 'Connect or authenticate the user\'s Google account. Use when user needs to sign in to Google.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  check_google_connection: {
    name: 'check_google_connection',
    description: 'Check if Google account is connected. Use to verify authentication status.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

// Type for tool parameters
type ToolParams = Record<string, any>;

/**
 * Execute a tool by name with given parameters
 * This is used by the main process to handle IPC tool calls
 */
export async function executeTool(toolName: string, params: ToolParams): Promise<string> {
  console.log(`Executing tool: ${toolName}`, params);

  try {
    switch (toolName) {
      // Calendar tools
      case 'get_upcoming_events':
        return await calendar.getUpcomingEvents(params);
      case 'get_today_agenda':
        return await calendar.getTodayAgenda();
      case 'get_tomorrow_agenda':
        return await calendar.getTomorrowAgenda();
      case 'get_events_for_day':
        return await calendar.getEventsForDay(params);
      case 'create_calendar_event':
        return await calendar.createCalendarEvent(params as any);
      case 'search_calendar_events':
        return await calendar.searchCalendarEvents(params as any);

      // Gmail tools
      case 'get_recent_emails':
        return await gmail.getRecentEmails(params);
      case 'get_unread_count':
        return await gmail.getUnreadCount();
      case 'read_email':
        return await gmail.readEmail(params as any);
      case 'search_emails':
        return await gmail.searchEmails(params as any);
      case 'send_email':
        return await gmail.sendEmail(params as any);
      case 'reply_to_email':
        return await gmail.replyToEmail(params as any);
      case 'get_emails_from_sender':
        return await gmail.getEmailsFromSender(params as any);

      // Auth tools
      case 'connect_google_account':
        const success = await googleAuth.authenticateGoogle();
        return success 
          ? 'Great! Your Google account is now connected. You can now use calendar and email features.'
          : 'I had trouble connecting your Google account. Please try again.';
      case 'check_google_connection':
        return googleAuth.isAuthenticated()
          ? 'Your Google account is connected and ready to use.'
          : 'Your Google account is not connected. Would you like me to help you connect it?';

      default:
        console.warn(`Unknown tool: ${toolName}`);
        return `I don't know how to handle that request yet.`;
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for authentication errors
    if (errorMessage.includes('authentication required') || errorMessage.includes('Missing GOOGLE')) {
      return 'You need to connect your Google account first. Would you like me to help you do that?';
    }
    
    return `I had trouble with that request. ${errorMessage}`;
  }
}

/**
 * Get client tools configuration for ElevenLabs Conversation
 * Returns a record of tool functions that can be passed to Conversation.startSession
 */
export function getClientTools(): Record<string, (params: any) => Promise<string>> {
  return {
    // Calendar tools
    get_upcoming_events: (params) => executeTool('get_upcoming_events', params),
    get_today_agenda: (params) => executeTool('get_today_agenda', params),
    get_tomorrow_agenda: (params) => executeTool('get_tomorrow_agenda', params),
    get_events_for_day: (params) => executeTool('get_events_for_day', params),
    create_calendar_event: (params) => executeTool('create_calendar_event', params),
    search_calendar_events: (params) => executeTool('search_calendar_events', params),

    // Gmail tools
    get_recent_emails: (params) => executeTool('get_recent_emails', params),
    get_unread_count: (params) => executeTool('get_unread_count', params),
    read_email: (params) => executeTool('read_email', params),
    search_emails: (params) => executeTool('search_emails', params),
    send_email: (params) => executeTool('send_email', params),
    reply_to_email: (params) => executeTool('reply_to_email', params),
    get_emails_from_sender: (params) => executeTool('get_emails_from_sender', params),

    // Auth tools
    connect_google_account: (params) => executeTool('connect_google_account', params),
    check_google_connection: (params) => executeTool('check_google_connection', params),
  };
}

/**
 * Get authentication status
 */
export function isGoogleAuthenticated(): boolean {
  return googleAuth.isAuthenticated();
}

/**
 * Sign out from Google
 */
export function signOutGoogle(): void {
  googleAuth.signOut();
}
