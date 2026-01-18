// Google OAuth2 Authentication Service
// Handles OAuth flow for Google Calendar and Gmail access

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { BrowserWindow, shell } from 'electron';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';

// Scopes required for Calendar and Gmail access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
];

// Token storage path
const TOKEN_PATH = path.join(process.cwd(), '.google-token.json');

let oauth2Client: OAuth2Client | null = null;

interface StoredToken {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

/**
 * Get OAuth2 credentials from environment variables
 */
function getCredentials(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env file');
  }

  return {
    clientId,
    clientSecret,
    redirectUri: 'http://localhost:3847/oauth2callback',
  };
}

/**
 * Create OAuth2 client
 */
function createOAuth2Client(): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = getCredentials();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Load stored token from file if exists
 */
function loadStoredToken(): StoredToken | null {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const tokenData = fs.readFileSync(TOKEN_PATH, 'utf-8');
      return JSON.parse(tokenData);
    }
  } catch (error) {
    console.error('Error loading stored token:', error);
  }
  return null;
}

/**
 * Save token to file
 */
function saveToken(token: StoredToken): void {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
    console.log('Token saved to', TOKEN_PATH);
  } catch (error) {
    console.error('Error saving token:', error);
  }
}

/**
 * Get authenticated OAuth2 client
 * Attempts to use stored token, or initiates OAuth flow if needed
 */
export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  if (oauth2Client) {
    return oauth2Client;
  }

  oauth2Client = createOAuth2Client();
  
  // Try to load stored token
  const storedToken = loadStoredToken();
  if (storedToken) {
    oauth2Client.setCredentials(storedToken);
    
    // Check if token is expired
    if (storedToken.expiry_date && storedToken.expiry_date > Date.now()) {
      console.log('Using stored Google OAuth token');
      return oauth2Client;
    }
    
    // Try to refresh the token
    try {
      console.log('Refreshing expired Google OAuth token...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      saveToken(credentials as StoredToken);
      return oauth2Client;
    } catch (error) {
      console.log('Token refresh failed, need re-authentication');
    }
  }

  // Need to authenticate
  throw new Error('Google authentication required. Call authenticateGoogle() first.');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const storedToken = loadStoredToken();
  return !!storedToken && (!storedToken.expiry_date || storedToken.expiry_date > Date.now());
}

/**
 * Start OAuth2 authentication flow
 * Opens browser for user to authenticate and handles callback
 */
export async function authenticateGoogle(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const client = createOAuth2Client();
    
    // Generate authentication URL
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force consent screen to get refresh token
    });

    console.log('Starting Google OAuth flow...');
    console.log('Auth URL:', authUrl);

    // Create local server to handle OAuth callback
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400);
          res.end('Bad request');
          return;
        }

        const parsedUrl = url.parse(req.url, true);
        
        if (parsedUrl.pathname === '/oauth2callback') {
          const code = parsedUrl.query.code as string;
          
          if (!code) {
            res.writeHead(400);
            res.end('No authorization code received');
            server.close();
            resolve(false);
            return;
          }

          // Exchange code for tokens
          const { tokens } = await client.getToken(code);
          client.setCredentials(tokens);
          
          // Save tokens
          saveToken(tokens as StoredToken);
          
          // Update global client
          oauth2Client = client;

          // Send success response
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head>
                <title>Authentication Successful</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                  }
                  .container {
                    text-align: center;
                    padding: 40px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 16px;
                    backdrop-filter: blur(10px);
                  }
                  h1 { margin-bottom: 16px; }
                  p { opacity: 0.9; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>✅ Authentication Successful!</h1>
                  <p>You can close this window and return to the app.</p>
                </div>
              </body>
            </html>
          `);

          server.close();
          console.log('Google OAuth authentication successful!');
          resolve(true);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        res.writeHead(500);
        res.end('Authentication failed');
        server.close();
        reject(error);
      }
    });

    // Start server on port 3847
    server.listen(3847, () => {
      console.log('OAuth callback server listening on port 3847');
      // Open browser for authentication
      shell.openExternal(authUrl);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timed out'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Sign out - remove stored token
 */
export function signOut(): void {
  oauth2Client = null;
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
      console.log('Google OAuth token removed');
    }
  } catch (error) {
    console.error('Error removing token:', error);
  }
}

/**
 * Get the OAuth2 client for API calls
 */
export function getOAuth2Client(): OAuth2Client | null {
  return oauth2Client;
}
