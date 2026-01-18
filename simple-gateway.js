#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Parse command line arguments
const args = process.argv.slice(2);
const port = args.find(arg => arg.startsWith('--port='))?.split('=')[1] || 5000;

// Default config
let config = {
  routes: [
    { path: '/api/v1/users', target: 'http://localhost:5001' },
    { path: '/api/v1/user-invitations', target: 'http://localhost:5001' },
    { path: '/api/v1/projects', target: 'http://localhost:5004' },
    { path: '/api/v1/reports', target: 'http://localhost:5004' },
    { path: '/api/v1/probes', target: 'http://localhost:5004' },
    { path: '/api/v1/logs', target: 'http://localhost:5004' },
    { path: '/api/v1/webhooks', target: 'http://localhost:5003' },
    { path: '/api/v1/alerts', target: 'http://localhost:5003' },

  ],
  cors: true,
  timeout: 30000
};

// Find matching route
function findRoute(reqPath) {
  return config.routes.find(route => reqPath.startsWith(route.path)) || {
    path: "/",
    target: "http://localhost:3000"
  };
}

// Proxy request
function proxyRequest(clientReq, clientRes, route) {
  const targetUrl = new URL(route.target);
  const isHttps = targetUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  // Build proxy path
  let proxyPath = clientReq.url;
  if (route.pathRewrite) {
    Object.keys(route.pathRewrite).forEach(pattern => {
      const regex = new RegExp(pattern);
      proxyPath = proxyPath.replace(regex, route.pathRewrite[pattern]);
    });
  }

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path: proxyPath,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: targetUrl.host,
    },
    timeout: route.timeout || config.timeout,
  };

  console.log(`[${new Date().toISOString()}] ${clientReq.method} ${clientReq.url} -> ${route.target}${proxyPath}`);

  const proxyReq = httpModule.request(options, (proxyRes) => {
    // Set CORS headers if enabled
    if (config.cors) {
      clientRes.setHeader('Access-Control-Allow-Origin', '*');
      clientRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      clientRes.setHeader('Access-Control-Allow-Headers', '*');
    }

    // Copy status and headers
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);

    // Pipe response
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', (err) => {
    console.error(`Proxy error for ${route.path}:`, err.message);
    clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({
      error: 'Bad Gateway',
      message: `Service unavailable: ${route.path}`,
      target: route.target
    }));
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    console.error(`Proxy timeout for ${route.path}`);
    clientRes.writeHead(504, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({
      error: 'Gateway Timeout',
      message: `Service timeout: ${route.path}`
    }));
  });

  // Pipe request body
  clientReq.pipe(proxyReq);
}

// Create server
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS' && config.cors) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': '*',
    });
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', gateway: 'simple-gateway' }));
    return;
  }

  // Find matching route
  const route = findRoute(req.url);
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: `No route configured for: ${req.url}`
    }));
    return;
  }

  // Proxy the request
  proxyRequest(req, res, route);
});

// Start server
server.listen(port, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Simple Gateway Server Running        ║
╠════════════════════════════════════════╣
║   Port: ${port.toString().padEnd(30)} ║
╚════════════════════════════════════════╝

Routes:
${config.routes.map(r => `  ${r.path.padEnd(20)} -> ${r.target}`).join('\n')}

Health check: http://localhost:${port}/health
  `);
});