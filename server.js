const express = require('express');
const expressWs = require('express-ws');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
expressWs(app);

// Middleware to parse JSON and raw bodies
app.use(bodyParser.json({ limit: '10mb', type: ['application/json'] }));
app.use(bodyParser.raw({ type: '*/*', limit: '10mb' }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Store mapping from subdomain ID to websocket client
const wsClients = new Map();

function generateFunId() {
  const colors = ['purple', 'blue', 'green', 'red', 'yellow', 'orange', 'pink', 'teal', 'silver', 'gold'];
  const animals = ['monkey', 'tiger', 'lion', 'panda', 'eagle', 'shark', 'wolf', 'fox', 'bear', 'owl'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${randomColor}-${randomAnimal}-${randomSuffix}`;
}

// WebSocket endpoint for BOTH CLI tools and Browsers
app.ws('/ws', function(ws, req) {
  const host = req.headers.host;
  const subdomainId = extractSubdomain(host);

  // Check if this connection is from a browser or the CLI
  if (subdomainId && wsClients.has(subdomainId)) {
    // --- THIS IS A BROWSER CONNECTING ---
    console.log(`[Socket] Browser connected for session: ${subdomainId}`);

    // Listen for feedback messages from THIS browser
    ws.on('message', (msg) => {
      // Find the correct CLI tool's websocket
      const cliWs = wsClients.get(subdomainId);
      if (cliWs && cliWs.readyState === 1) { // 1 means OPEN
        console.log(`[Forwarding] Relaying feedback from browser to CLI for session ${subdomainId}`);
        // Forward the exact message to the CLI tool
        cliWs.send(msg);
      }
    });
    
    ws.on('close', () => {
        console.log(`[Socket] Browser for ${subdomainId} disconnected.`);
    });

  } else {
    // --- THIS IS A CLI CONNECTING ---
    console.log('[Socket] A new CLI tool has connected.');
    const id = generateFunId();
    wsClients.set(id, ws);
    
    // The CLI does not need to listen for messages here,
    // the proxy handler attaches one-time listeners.
    
    const url = `https://${id}.threddr.com`;
    ws.send(JSON.stringify({ type: 'url', data: url }));

    ws.on('close', () => {
      wsClients.delete(id);
      console.log(`[Socket] CLI tool for ${id} disconnected.`);
    });

    // Listen for messages from the CLI (e.g., developer-reply)
    ws.on('message', (msg) => {
      let parsed;
      try {
        parsed = JSON.parse(msg);
      } catch (e) {
        return;
      }
      if (parsed && parsed.type === 'developer-reply') {
        // Find the browser websocket for this session
        // We need to track browser websockets by subdomainId
        // We'll use a global map for browser websockets
        if (!global.browserWsMap) global.browserWsMap = new Map();
        const browserWs = global.browserWsMap.get(id);
        if (browserWs && browserWs.readyState === 1) {
          browserWs.send(msg);
        }
      }
    });
  }
});

// Helper: Extract subdomain from host (e.g., teal-tiger-cak8.threddr.com)
function extractSubdomain(host) {
  if (!host) return null;
  const parts = host.split('.');
  // Expecting: [subdomain, 'threddr', 'com']
  if (parts.length < 3) return null;
  
  // THE CRITICAL FIX IS HERE
  if (parts[parts.length - 2] !== 'threddr' || parts[parts.length - 1] !== 'com') {
    return null;
  }
  
  return parts[0]; // Return just the first part (the random ID)
}

// Proxy handler for all HTTP requests to subdomains of threddr.com
app.use(async (req, res, next) => {
  const host = req.headers.host;
  const subdomainId = extractSubdomain(host);
  // Only handle requests for *.threddr.com
  if (!subdomainId || !host.endsWith('.threddr.com')) {
    return res.status(400).send('Invalid or missing subdomain');
  }
  const ws = wsClients.get(subdomainId);
  if (!ws || ws.readyState !== 1) {
    return res.status(502).send('No active relay for this subdomain');
  }

  // Generate a unique request ID for matching response
  const requestId = uuidv4();

  // Prepare the request payload
    let body = req.body;
  let isBase64 = false;

  if (Buffer.isBuffer(body)) {
    body = body.toString('base64');
    isBase64 = true;
  } else if (typeof body === 'object' && body !== null) {
    // CRITICAL FIX: Stringify JSON objects before sending
    body = JSON.stringify(body);
  }

  const payload = {
    type: 'proxy-request',
    requestId,
    method: req.method,
    path: req.originalUrl,
    headers: req.headers,
    body,
    isBase64
  };
  // Set up a one-time message handler for the response
  const handleMessage = (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'proxy-response' && data.requestId === requestId) {
        ws.off('message', handleMessage);
        // Sanitize and set response headers
        const responseHeaders = data.headers || {};
        // These headers are often problematic in proxies
        delete responseHeaders['transfer-encoding'];
        delete responseHeaders['content-encoding'];
        delete responseHeaders['content-length']; // The framework will set this correctly

        res.status(data.statusCode || 200);

        if (responseHeaders) {
          Object.entries(responseHeaders).forEach(([k, v]) => {
            // Avoid setting problematic headers like 'Connection'
            if (k.toLowerCase() !== 'connection') {
              res.setHeader(k, v);
            }
          });
        }
        // Injection logic for HTML responses
        const contentType = (responseHeaders['content-type'] || '').toLowerCase();
        if (data.isBase64 && data.body && contentType.includes('text/html')) {
          let html = Buffer.from(data.body, 'base64').toString('utf8');
          // Inject the setup script and widget.js script before </body>
          const setupScript = `<script>window.Mirage = {};
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = wsProtocol + '//' + window.location.host + '/ws';
window.Mirage.socket = new WebSocket(wsUrl);
window.Mirage.socket.onopen = () => console.log('Mirage feedback socket connected.');</script>`;
          const widgetScript = '<script src="/widget.js"></script>';
          html = html.replace(/<\/body>/i, `${setupScript}${widgetScript}</body>`);
          const modifiedBody = Buffer.from(html, 'utf8').toString('base64');
          res.send(Buffer.from(modifiedBody, 'base64'));
        } else if (data.isBase64 && data.body) {
          res.send(Buffer.from(data.body, 'base64'));
        } else {
          res.send(data.body);
        }
      }
    } catch (err) {
      // Ignore parse errors for unrelated messages
    }
  };
  ws.on('message', handleMessage);

  // Send the request to the CLI tool
  ws.send(JSON.stringify(payload));

  // Timeout if no response in 30s
  const timeout = setTimeout(() => {
    ws.off('message', handleMessage);
    res.status(504).send('Relay timeout');
  }, 30000);

  res.on('finish', () => clearTimeout(timeout));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Mirage] Relay server listening on port ${PORT}`);
}); 
