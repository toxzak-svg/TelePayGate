const path = require('path');
const fs = require('fs');

module.exports = async () => {
  if (process.env.USE_TESTCONTAINERS !== 'true') {
    return;
  }

  // Use the API package's fixture helper to start a Postgres container so
  // all packages reuse the same helper and file location.
  const fixtureMod = require('../api/src/__tests__/fixtures/postgresFixture');
  if (!fixtureMod || typeof fixtureMod.startPostgresFixture !== 'function') {
    console.warn('[core.jest.global-setup] startPostgresFixture not available; skipping global fixture.');
    return;
  }

  console.log('[core.jest.global-setup] Starting shared Postgres fixture...');
  const fixture = await fixtureMod.startPostgresFixture();

  const outDir = path.resolve(__dirname, '../api/tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.resolve(outDir, 'tc-db.json');

  const payload = {
    databaseUrl: fixture.databaseUrl,
  };

  try {
    if (fixture.container) {
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
    // ignore
  }

  fs.writeFileSync(outFile, JSON.stringify(payload), 'utf8');
  console.log('[core.jest.global-setup] Wrote DB info to', outFile);
};
