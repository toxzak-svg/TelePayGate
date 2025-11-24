const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

module.exports = async () => {
  if (process.env.USE_TESTCONTAINERS !== 'true') return;

  const outFile = path.resolve(__dirname, 'tmp', 'tc-db.json');
  if (!fs.existsSync(outFile)) {
    console.warn('[jest.global-teardown] No tc-db.json found; nothing to stop.');
    return;
  }

  const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  // Attempt to stop the container if we captured a containerId. This is best-effort.
  try {
    if (payload.containerId) {
      console.log('[jest.global-teardown] Stopping container', payload.containerId);
      try {
        execSync(`docker stop ${payload.containerId}`, { stdio: 'inherit' });
        execSync(`docker rm ${payload.containerId}`, { stdio: 'inherit' });
      } catch (err) {
        console.warn('[jest.global-teardown] Failed to stop container by id (best-effort):', err && err.message);
      }
    } else {
      console.log('[jest.global-teardown] no containerId available; leaving container running (Docker may clean up).');
    }
  } catch (err) {
    console.warn('[jest.global-teardown] error during teardown:', err && err.message);
  }

  try {
    fs.unlinkSync(outFile);
  } catch (err) {
    // ignore
  }
};
