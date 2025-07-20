const express = require('express');
const expressWs = require('express-ws');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
expressWs(app);

// Middleware to parse JSON and raw bodies
app.use(bodyParser.json({ limit: '10mb', type: ['application/json'] }));
app.use(bodyParser.raw({ type: '*/*', limit: '10mb' }));

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

// WebSocket endpoint for CLI tools to connect
app.ws('/ws', function(ws, req) {
  console.log('A new CLI tool has connected.');
  const id = generateFunId();
  wsClients.set(id, ws);
  // Construct the shareable URL using the custom domain
  const url = `https://${id}.threddr.com`;
  ws.send(JSON.stringify({ type: 'url', data: url }));

  ws.on('close', () => {
    wsClients.delete(id);
    console.log(`[Mirage] CLI tool for ${id} disconnected.`);
  });
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
        if (data.isBase64 && data.body) {
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
