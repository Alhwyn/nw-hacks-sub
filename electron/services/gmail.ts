// Gmail Service
// Provides email operations for the ElevenLabs agent tools

import { google, gmail_v1 } from 'googleapis';
import { getAuthenticatedClient, isAuthenticated } from './googleAuth';

type Gmail = gmail_v1.Gmail;
type Message = gmail_v1.Schema$Message;

/**
 * Get Gmail API client
 */
async function getGmailClient(): Promise<Gmail> {
  const auth = await getAuthenticatedClient();
  return google.gmail({ version: 'v1', auth });
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(str: string): string {
  // Replace URL-safe characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Encode string to base64url
 */
function encodeBase64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Get header value from message
 */
function getHeader(message: Message, name: string): string {
  const headers = message.payload?.headers || [];
  const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

/**
 * Format date for display (elderly-friendly)
 */
function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })}`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

/**
 * Extract plain text from message body
 */
function getMessageBody(message: Message): string {
  const payload = message.payload;
  
  if (!payload) return '';

  // Simple message with body data
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart message - find text/plain part
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fallback to text/html if no plain text
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64Url(part.body.data);
        // Simple HTML to text conversion
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      }
    }
  }

  return '';
}

/**
 * Format email for speech-friendly output
 */
function formatEmailForSpeech(message: Message, includeBody: boolean = false): string {
  const from = getHeader(message, 'From');
  const subject = getHeader(message, 'Subject') || 'No subject';
  const date = getHeader(message, 'Date');

  // Extract sender name from email
  const senderMatch = from.match(/^([^<]+)/);
  const sender = senderMatch?.[1]?.trim() || from;

  let result = `From ${sender}: "${subject}"`;
  
  if (date) {
    result += ` - ${formatDateForDisplay(date)}`;
  }

  if (includeBody) {
    const body = getMessageBody(message);
    if (body) {
      // Truncate for speech
      const shortBody = body.substring(0, 500).replace(/\n+/g, ' ').trim();
      result += `\n\nMessage: ${shortBody}${body.length > 500 ? '...' : ''}`;
    }
  }

  return result;
}

// ==================== GMAIL TOOL FUNCTIONS ====================

/**
 * Get recent emails from inbox
 * Tool: get_recent_emails
 */
export async function getRecentEmails(params: {
  maxResults?: number;
  unreadOnly?: boolean;
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const gmail = await getGmailClient();
    const maxResults = params.maxResults || 5;
    const query = params.unreadOnly ? 'is:unread' : '';

    console.log('Fetching emails:', { maxResults, unreadOnly: params.unreadOnly });

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
      labelIds: ['INBOX'],
    });

    const messages = listResponse.data.messages;

    if (!messages || messages.length === 0) {
      if (params.unreadOnly) {
        return 'Great news! You have no unread emails. Your inbox is all caught up!';
      }
      return 'Your inbox is empty. No emails to show.';
    }

    // Fetch details for each message
    const emailDetails: string[] = [];
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message?.id) continue;
      
      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });
      
      const msg = msgResponse.data;
      const from = getHeader(msg, 'From');
      const subject = getHeader(msg, 'Subject') || 'No subject';
      
      // Extract sender name
      const senderMatch = from.match(/^([^<]+)/);
      const sender = senderMatch?.[1]?.trim() || from;
      
      emailDetails.push(`${i + 1}. From ${sender}: "${subject}"`);
    }

    const prefix = params.unreadOnly 
      ? `You have ${messages.length} unread email${messages.length > 1 ? 's' : ''}` 
      : `Here are your ${messages.length} most recent emails`;

    return `${prefix}:\n${emailDetails.join('\n')}`;
  } catch (error) {
    console.error('Error fetching emails:', error);
    return 'I had trouble accessing your emails. Please make sure your Google account is connected.';
  }
}

/**
 * Get unread email count
 * Tool: get_unread_count
 */
export async function getUnreadCount(): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const gmail = await getGmailClient();

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      labelIds: ['INBOX'],
      maxResults: 100,
    });

    const count = response.data.resultSizeEstimate || 0;

    if (count === 0) {
      return 'You have no unread emails. Your inbox is all caught up!';
    } else if (count === 1) {
      return 'You have 1 unread email.';
    } else {
      return `You have ${count} unread emails.`;
    }
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 'I had trouble checking your emails. Please make sure your Google account is connected.';
  }
}

/**
 * Read a specific email by index from recent emails
 * Tool: read_email
 */
export async function readEmail(params: {
  emailIndex: number;
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const gmail = await getGmailClient();
    const index = params.emailIndex - 1; // Convert to 0-based

    // Get recent messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      labelIds: ['INBOX'],
    });

    const messages = listResponse.data.messages;

    if (!messages || messages.length === 0) {
      return 'Your inbox is empty.';
    }

    if (index < 0 || index >= messages.length) {
      return `I can only read emails 1 through ${messages.length}. Which one would you like me to read?`;
    }

    const targetMessage = messages[index];
    if (!targetMessage?.id) {
      return 'I couldn\'t find that email.';
    }

    // Fetch full message
    const msgResponse = await gmail.users.messages.get({
      userId: 'me',
      id: targetMessage.id,
      format: 'full',
    });

    const message = msgResponse.data;
    return formatEmailForSpeech(message, true);
  } catch (error) {
    console.error('Error reading email:', error);
    return 'I had trouble reading that email. Please try again.';
  }
}

/**
 * Search emails
 * Tool: search_emails
 */
export async function searchEmails(params: {
  query: string;
  maxResults?: number;
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const gmail = await getGmailClient();
    const maxResults = params.maxResults || 5;

    console.log('Searching emails for:', params.query);

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: params.query,
    });

    const messages = listResponse.data.messages;

    if (!messages || messages.length === 0) {
      return `I couldn't find any emails matching "${params.query}".`;
    }

    // Fetch details for each message
    const emailDetails: string[] = [];
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message?.id) continue;
      
      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });
      
      const msg = msgResponse.data;
      const from = getHeader(msg, 'From');
      const subject = getHeader(msg, 'Subject') || 'No subject';
      
      // Extract sender name
      const senderMatch = from.match(/^([^<]+)/);
      const sender = senderMatch?.[1]?.trim() || from;
      
      emailDetails.push(`${i + 1}. From ${sender}: "${subject}"`);
    }

    return `I found ${messages.length} email${messages.length > 1 ? 's' : ''} matching "${params.query}":\n${emailDetails.join('\n')}`;
  } catch (error) {
    console.error('Error searching emails:', error);
    return 'I had trouble searching your emails. Please try again.';
  }
}

/**
 * Send an email
 * Tool: send_email
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const gmail = await getGmailClient();

    // Get user's email address
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const fromEmail = profile.data.emailAddress;

    // Construct the email
    const emailLines = [
      `To: ${params.to}`,
      `From: ${fromEmail}`,
      `Subject: ${params.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      params.body,
    ];
    const email = emailLines.join('\r\n');
    const encodedEmail = encodeBase64Url(email);

    console.log('Sending email to:', params.to);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    return `I've sent your email to ${params.to} with the subject "${params.subject}".`;
  } catch (error) {
    console.error('Error sending email:', error);
    return 'I had trouble sending that email. Please check the email address and try again.';
  }
}

/**
 * Reply to an email
 * Tool: reply_to_email
 */
export async function replyToEmail(params: {
  emailIndex: number;
  replyBody: string;
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const gmail = await getGmailClient();
    const index = params.emailIndex - 1;

    // Get recent messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      labelIds: ['INBOX'],
    });

    const messages = listResponse.data.messages;

    if (!messages || messages.length === 0 || index < 0 || index >= messages.length) {
      return 'I couldn\'t find that email to reply to.';
    }

    const targetMessage = messages[index];
    if (!targetMessage?.id) {
      return 'I couldn\'t find that email to reply to.';
    }

    // Fetch original message
    const msgResponse = await gmail.users.messages.get({
      userId: 'me',
      id: targetMessage.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Message-ID', 'References'],
    });

    const originalMsg = msgResponse.data;
    const from = getHeader(originalMsg, 'From');
    const subject = getHeader(originalMsg, 'Subject');
    const messageId = getHeader(originalMsg, 'Message-ID');
    const references = getHeader(originalMsg, 'References');

    // Extract email address from "Name <email>" format
    const emailMatch = from.match(/<([^>]+)>/) || [null, from];
    const toEmail = emailMatch?.[1] || from;

    // Get user's email
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const fromEmail = profile.data.emailAddress;

    // Build reply subject
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    // Build References header
    const newReferences = references ? `${references} ${messageId}` : messageId;

    // Construct the reply email
    const emailLines = [
      `To: ${toEmail}`,
      `From: ${fromEmail}`,
      `Subject: ${replySubject}`,
      `In-Reply-To: ${messageId}`,
      `References: ${newReferences}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      params.replyBody,
    ];
    const email = emailLines.join('\r\n');
    const encodedEmail = encodeBase64Url(email);

    console.log('Replying to:', toEmail);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        threadId: originalMsg.threadId,
      },
    });

    // Extract sender name
    const senderMatch = from.match(/^([^<]+)/);
    const sender = senderMatch?.[1]?.trim() || from;

    return `I've sent your reply to ${sender}.`;
  } catch (error) {
    console.error('Error replying to email:', error);
    return 'I had trouble sending that reply. Please try again.';
  }
}

/**
 * Mark email as read
 * Tool: mark_email_read
 */
export async function markEmailRead(params: {
  emailIndex: number;
}): Promise<string> {
  if (!isAuthenticated()) {
    return 'You need to connect your Google account first. Would you like me to help you do that?';
  }

  try {
    const gmail = await getGmailClient();
    const index = params.emailIndex - 1;

    // Get recent messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      labelIds: ['INBOX'],
    });

    const messages = listResponse.data.messages;

    if (!messages || messages.length === 0 || index < 0 || index >= messages.length) {
      return 'I couldn\'t find that email.';
    }

    const targetMessage = messages[index];
    if (!targetMessage?.id) {
      return 'I couldn\'t find that email.';
    }

    await gmail.users.messages.modify({
      userId: 'me',
      id: targetMessage.id,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });

    return 'I\'ve marked that email as read.';
  } catch (error) {
    console.error('Error marking email as read:', error);
    return 'I had trouble marking that email as read.';
  }
}

/**
 * Get emails from a specific sender
 * Tool: get_emails_from_sender
 */
export async function getEmailsFromSender(params: {
  senderName: string;
  maxResults?: number;
}): Promise<string> {
  const query = `from:${params.senderName}`;
  return searchEmails({ query, maxResults: params.maxResults });
}
