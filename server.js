import http from 'node:http';
import serverEntry from './dist/server/index.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // Build a Request object from the Node.js req
  const url = new URL(req.url, `http://${req.headers.host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.append(key, Array.isArray(value) ? value.join(', ') : value);
    }
  }

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
  });

  try {
    const response = await serverEntry.fetch(request, {}, { waitUntil: () => {}, passThroughOnException: () => {} });

    res.statusCode = response.status;
    res.statusMessage = response.statusText;

    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (error) {
    console.error('Error handling request:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
