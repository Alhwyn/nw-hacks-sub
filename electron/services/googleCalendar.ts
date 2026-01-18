// Google Calendar Service
// Provides calendar operations for the ElevenLabs agent tools

import { google, calendar_v3 } from 'googleapis';
import { getAuthenticatedClient, isAuthenticated } from './googleAuth';

type Calendar = calendar_v3.Calendar;
type Event = calendar_v3.Schema$Event;

/**
 * Get Calendar API client
 */
async function getCalendarClient(): Promise<Calendar> {
  const auth = await getAuthenticatedClient();
  return google.calendar({ version: 'v3', auth });
}

/**
 * Format date for display (elderly-friendly)
 */
function formatDateForDisplay(dateTime: string | null | undefined, timeZone?: string): string {
  if (!dateTime) return 'No date';
  
  const date = new Date(dateTime);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format event for speech-friendly output
 */
function formatEventForSpeech(event: Event): string {
  const title = event.summary || 'Untitled event';
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;
  const location = event.location;
  const description = event.description;

  let result = `Event: ${title}`;
  
  if (start) {
    result += `. When: ${formatDateForDisplay(start)}`;
  }
  
  if (location) {
    result += `. Where: ${location}`;
  }
  
  if (description) {
    // Truncate description for speech
    const shortDesc = description.substring(0, 100);
    result += `. Details: ${shortDesc}${description.length > 100 ? '...' : ''}`;
  }

  return result;
}

// ==================== CALENDAR TOOL FUNCTIONS ====================

/**
 * Get upcoming events from the calendar
 * Tool: get_upcoming_events
 */
export async function getUpcomingEvents(params: {
  maxResults?: number;
  timeMin?: string;
  timeMax?: string;
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const calendar = await getCalendarClient();
    const maxResults = params.maxResults || 10;
    
    // Default to events from now
    const timeMin = params.timeMin || new Date().toISOString();
    
    // Default to 7 days from now if no end time specified
    const defaultTimeMax = new Date();
    defaultTimeMax.setDate(defaultTimeMax.getDate() + 7);
    const timeMax = params.timeMax || defaultTimeMax.toISOString();

    console.log('Fetching calendar events:', { maxResults, timeMin, timeMax });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items;

    if (!events || events.length === 0) {
      return 'You have no upcoming events in the next week. Your calendar is clear!';
    }

    const eventList = events.map((event, index) => {
      const start = event.start?.dateTime || event.start?.date;
      return `${index + 1}. ${event.summary || 'Untitled'} - ${formatDateForDisplay(start)}`;
    }).join('\n');

    return `Here are your upcoming events:\n${eventList}`;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return 'I had trouble accessing your calendar. Please make sure your Google account is connected.';
  }
}

/**
 * Get events for a specific day
 * Tool: get_events_for_day
 */
export async function getEventsForDay(params: {
  date?: string; // YYYY-MM-DD format, defaults to today
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const calendar = await getCalendarClient();
    
    // Parse date or use today
    let targetDate: Date;
    if (params.date) {
      targetDate = new Date(params.date);
    } else {
      targetDate = new Date();
    }
    
    // Set to start of day
    const timeMin = new Date(targetDate);
    timeMin.setHours(0, 0, 0, 0);
    
    // Set to end of day
    const timeMax = new Date(targetDate);
    timeMax.setHours(23, 59, 59, 999);

    const dayName = targetDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });

    console.log('Fetching events for:', dayName);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items;

    if (!events || events.length === 0) {
      return `You have no events scheduled for ${dayName}. It's a free day!`;
    }

    const eventList = events.map((event, index) => {
      const start = event.start?.dateTime || event.start?.date;
      const time = start ? new Date(start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }) : 'All day';
      return `${index + 1}. ${time} - ${event.summary || 'Untitled'}`;
    }).join('\n');

    return `Here's your schedule for ${dayName}:\n${eventList}`;
  } catch (error) {
    console.error('Error fetching day events:', error);
    return 'I had trouble accessing your calendar. Please make sure your Google account is connected.';
  }
}

/**
 * Create a new calendar event
 * Tool: create_calendar_event
 */
export async function createCalendarEvent(params: {
  title: string;
  startDateTime: string; // ISO 8601 format
  endDateTime?: string; // ISO 8601 format, defaults to 1 hour after start
  location?: string;
  description?: string;
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const calendar = await getCalendarClient();
    
    const startTime = new Date(params.startDateTime);
    
    // Default end time is 1 hour after start
    let endTime: Date;
    if (params.endDateTime) {
      endTime = new Date(params.endDateTime);
    } else {
      endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);
    }

    const event: calendar_v3.Schema$Event = {
      summary: params.title,
      location: params.location,
      description: params.description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    console.log('Creating calendar event:', event.summary);

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    const createdEvent = response.data;
    const displayDate = formatDateForDisplay(createdEvent.start?.dateTime);

    return `I've added "${params.title}" to your calendar for ${displayDate}. Is there anything else you'd like me to do?`;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return 'I had trouble creating that event. Please try again or check your Google account connection.';
  }
}

/**
 * Search for events
 * Tool: search_calendar_events
 */
export async function searchCalendarEvents(params: {
  query: string;
  maxResults?: number;
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const calendar = await getCalendarClient();
    const maxResults = params.maxResults || 10;
    
    // Search in upcoming 30 days
    const timeMin = new Date().toISOString();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30);

    console.log('Searching calendar for:', params.query);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax: timeMax.toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
      q: params.query,
    });

    const events = response.data.items;

    if (!events || events.length === 0) {
      return `I couldn't find any events matching "${params.query}" in the next 30 days.`;
    }

    const eventList = events.map((event, index) => {
      const start = event.start?.dateTime || event.start?.date;
      return `${index + 1}. ${event.summary || 'Untitled'} - ${formatDateForDisplay(start)}`;
    }).join('\n');

    return `I found these events matching "${params.query}":\n${eventList}`;
  } catch (error) {
    console.error('Error searching calendar:', error);
    return 'I had trouble searching your calendar. Please make sure your Google account is connected.';
  }
}

/**
 * Delete a calendar event
 * Tool: delete_calendar_event
 */
export async function deleteCalendarEvent(params: {
  eventId: string;
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const calendar = await getCalendarClient();

    console.log('Deleting calendar event:', params.eventId);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: params.eventId,
    });

    return 'The event has been removed from your calendar.';
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return 'I had trouble deleting that event. It may have already been removed.';
  }
}

/**
 * Get today's agenda summary
 * Tool: get_today_agenda
 */
export async function getTodayAgenda(): Promise<string> {
  return getEventsForDay({ date: new Date().toISOString().split('T')[0] });
}

/**
 * Get tomorrow's agenda
 * Tool: get_tomorrow_agenda
 */
export async function getTomorrowAgenda(): Promise<string> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getEventsForDay({ date: tomorrow.toISOString().split('T')[0] });
}
