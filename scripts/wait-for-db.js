const net = require('net');
const host = process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.DB_PORT || '5432', 10);
const maxAttempts = parseInt(process.env.MAX_ATTEMPTS || '12', 10);
const delayMs = parseInt(process.env.DELAY_MS || '5000', 10);
let attempts = 0;
function tryConn() {
  attempts++;
  const s = net.connect(port, host, () => {
    console.log(`✅ DB reachable at ${host}:${port}`);
    s.end();
    process.exit(0);
  });
  s.on('error', () => {
    console.log(`Attempt ${attempts}/${maxAttempts}: DB not ready at ${host}:${port}`);
    if (attempts >= maxAttempts) {
      console.error('❌ Timeout waiting for DB');
      process.exit(2);
    }
    setTimeout(tryConn, delayMs);
  });
}
tryConn();
