const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

module.exports = async () => {
  if (process.env.USE_TESTCONTAINERS !== 'true') return;

  const outFile = path.resolve(__dirname, 'tmp', 'tc-db.json');
  // fallback to API tmp location
  const apiFile = path.resolve(__dirname, '../api/tmp/tc-db.json');
  const fileToUse = fs.existsSync(outFile) ? outFile : (fs.existsSync(apiFile) ? apiFile : null);

  if (!fileToUse) {
    console.warn('[core.jest.global-teardown] No tc-db.json found; nothing to stop.');
    return;
  }

  const payload = JSON.parse(fs.readFileSync(fileToUse, 'utf8'));
  try {
    if (payload.containerId) {
      console.log('[core.jest.global-teardown] Stopping container', payload.containerId);
      try {
        execSync(`docker stop ${payload.containerId}`, { stdio: 'inherit' });
        execSync(`docker rm ${payload.containerId}`, { stdio: 'inherit' });
      } catch (err) {
        console.warn('[core.jest.global-teardown] Failed to stop container by id (best-effort):', err && err.message);
      }
    } else {
      console.log('[core.jest.global-teardown] no containerId available; leaving container running (Docker may clean up).');
    }
  } catch (err) {
    console.warn('[core.jest.global-teardown] error during teardown:', err && err.message);
  }

  try {
    fs.unlinkSync(fileToUse);
  } catch (err) {}
};
