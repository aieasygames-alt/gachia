// Explicit loopback route for this batch when the user's proxy is unavailable.
// Only owned previews, the public site and Cloudflare control plane are allowed.
// This transports encrypted TLS bytes and never receives API credentials.
import { createServer } from 'node:http';
import { connect } from 'node:net';
const server = createServer((request, response) => { response.writeHead(405); response.end(); });
const sockets = new Set();
server.on('connect', (request, client, head) => {
  let target;
  try {
    target = new URL('https://' + request.url);
    if (target.port || target.username || target.password || target.pathname !== '/' || target.search || target.hash ||
      !(/^(?:api\.cloudflare\.com|[a-z0-9.-]+\.cloudflare\.com|gachia\.com|[a-f0-9]{8}-gachia(?:-game-(?:genshin|nte|azur-promilia|lvmeng))?\.aieasygames\.workers\.dev)$/.test(target.hostname))) throw Error();
  } catch { client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
  const upstream = connect(1087, '127.0.0.1');
  sockets.add(client); sockets.add(upstream);
  client.once('close', () => { sockets.delete(client); upstream.destroy(); });
  upstream.once('close', () => { sockets.delete(upstream); client.destroy(); });
  client.on('error', () => upstream.destroy()); upstream.on('error', () => client.destroy());
  upstream.setTimeout(60000, () => upstream.destroy()); client.setTimeout(60000, () => client.destroy());
  upstream.once('connect', () => {
    upstream.write('CONNECT ' + target.hostname + ':443 HTTP/1.1\r\nHost: ' + target.hostname + ':443\r\n\r\n');
    let pending = Buffer.alloc(0);
    const handshake = chunk => {
      pending = Buffer.concat([pending, chunk]);
      if (pending.length > 16384) return client.destroy();
      const end = pending.indexOf('\r\n\r\n'); if (end < 0) return;
      upstream.removeListener('data', handshake);
      if (!/^HTTP\/1\.[01] 200(?: |\r)/.test(pending.toString())) return client.destroy();
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (pending.length > end + 4) client.write(pending.subarray(end + 4));
      if (head.length) upstream.write(head);
      client.pipe(upstream); upstream.pipe(client);
    };
    upstream.on('data', handshake);
  });
});
server.listen(18646, '127.0.0.1', () => console.log(JSON.stringify({ listening: 'http://127.0.0.1:18646', pid: process.pid, tlsDecrypted: false })));
process.on('SIGTERM', () => { for (const socket of sockets) socket.destroy(); server.close(); });
