#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const portArgIndex = process.argv.indexOf('--port');
const port = portArgIndex > -1 ? Number(process.argv[portArgIndex + 1]) : 3000;
const webRoot = path.resolve(__dirname, '..', 'web');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function send(res, code, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(code, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsed.pathname);

  if (pathname === '/') pathname = '/index.html';

  const filePath = path.resolve(webRoot, `.${pathname}`);
  if (!filePath.startsWith(webRoot)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, mime[ext] || 'application/octet-stream');
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Thumbnail web app running at http://localhost:${port}`);
});
