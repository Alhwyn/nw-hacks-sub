import { createServer, IncomingMessage, ServerResponse } from 'http';
import { showHighlight, clearHighlight } from '../overlay';

const PORT = 3001;
let server: ReturnType<typeof createServer> | null = null;

interface HighlightRequest {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  instruction: string;
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res: ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

export function startHighlightServer(): void {
  if (server) return;

  server = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      sendJSON(res, 200, {});
      return;
    }

    try {
      if (req.method === 'POST' && req.url === '/highlight') {
        const data: HighlightRequest = await parseBody(req);
        
        if (typeof data.x !== 'number' || 
            typeof data.y !== 'number' || 
            typeof data.width !== 'number' || 
            typeof data.height !== 'number') {
          sendJSON(res, 400, { error: 'Invalid coordinates' });
          return;
        }

        showHighlight(data);
        sendJSON(res, 200, { status: 'ok', message: 'Highlight shown' });
        return;
      }

      if ((req.method === 'POST' || req.method === 'GET') && req.url === '/clear') {
        clearHighlight();
        sendJSON(res, 200, { status: 'ok', message: 'Highlight cleared' });
        return;
      }

      if (req.method === 'GET' && req.url === '/health') {
        sendJSON(res, 200, { status: 'ok', service: 'highlight-server' });
        return;
      }

      sendJSON(res, 404, { error: 'Not found' });
    } catch (error) {
      sendJSON(res, 500, { error: 'Internal server error' });
    }
  });

  server.listen(PORT);

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} in use`);
    }
  });
}

export function stopHighlightServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
