const path = require('path');
const fs = require('fs');

module.exports = async () => {
  if (process.env.USE_TESTCONTAINERS !== 'true') {
    return;
  }

  // Use the existing fixture helper to start a Postgres container.
  const fixtureMod = require('./src/__tests__/fixtures/postgresFixture');
  if (!fixtureMod || typeof fixtureMod.startPostgresFixture !== 'function') {
    console.warn('[jest.global-setup] startPostgresFixture not available; skipping global fixture.');
    return;
  }

  console.log('[jest.global-setup] Starting shared Postgres fixture...');
  const fixture = await fixtureMod.startPostgresFixture();

  const outDir = path.resolve(__dirname, 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.resolve(outDir, 'tc-db.json');

  const payload = {
    databaseUrl: fixture.databaseUrl,
  };

  // Try to capture a container id if available (best-effort).
  try {
    if (fixture.container) {
      // StartedTestContainer may expose getId() or getContainerId() or container.id
      let cid = null;
      if (typeof fixture.container.getId === 'function') {
        cid = fixture.container.getId();
      } else if (typeof fixture.container.getContainerId === 'function') {
        cid = fixture.container.getContainerId();
      } else if (fixture.container.containerId) {
        cid = fixture.container.containerId;
      }
      if (cid) payload.containerId = cid;
    }
  } catch (err) {
    // ignore; best-effort only
  }

  fs.writeFileSync(outFile, JSON.stringify(payload), 'utf8');
  console.log('[jest.global-setup] Wrote DB info to', outFile);
};
