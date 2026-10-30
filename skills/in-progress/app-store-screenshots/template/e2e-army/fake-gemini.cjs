// A stand-in for Google's image API, so the backdrop tests never spend money or
// need a key. It answers POST /interactions with a small gradient PNG, records
// what it was sent, and can be told to fail. Test-only: the editor talks to it
// through GEMINI_API_BASE_URL, which e2e-army/server.cjs points here.
const http = require('node:http');
const { deflateSync, crc32 } = require('node:zlib');

function png(width, height) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
      row[1 + x * 3] = Math.round(40 + 150 * (x / width));
      row[2 + x * 3] = Math.round(60 + 120 * (y / height));
      row[3 + x * 3] = 150;
    }
    rows.push(row);
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(8 + data.length + 4);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function startFakeGemini(port) {
  const state = { calls: 0, last: null, mode: 'ok' };
  const image = png(72, 128).toString('base64');
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const send = (status, json) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(json)); };
      const body = Buffer.concat(chunks).toString('utf8');
      if (req.method === 'GET' && req.url === '/__state') return send(200, { calls: state.calls, last: state.last });
      if (req.method === 'POST' && req.url === '/__mode') { state.mode = JSON.parse(body).mode; return send(200, { mode: state.mode }); }
      if (req.method === 'POST' && req.url.endsWith('/interactions')) {
        state.calls += 1;
        state.last = { key: req.headers['x-goog-api-key'], body: JSON.parse(body) };
        if (state.mode === 'quota') return send(429, { error: { message: 'Quota exceeded for this project' } });
        if (state.mode === 'noimage') return send(200, { steps: [{ type: 'model_output', content: [{ type: 'text', text: 'I cannot paint that.' }] }] });
        return send(200, { steps: [{ type: 'thought', content: [] }, { type: 'model_output', content: [{ type: 'image', mime_type: 'image/png', data: image }] }] });
      }
      send(404, { error: { message: 'not found' } });
    });
  });
  server.listen(port, '127.0.0.1');
  return server;
}

module.exports = { startFakeGemini };
