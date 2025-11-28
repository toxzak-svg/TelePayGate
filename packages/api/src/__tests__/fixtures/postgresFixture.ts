import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

type Fixture = {
  container?: StartedTestContainer;
  databaseUrl?: string;
};

export async function startPostgresFixture(): Promise<Fixture> {
  // If a global Jest fixture wrote DB info, reuse it instead of starting
  // a new container. This allows shared global setup to control lifecycle.
  try {
    const _possible = path.resolve(__dirname, '../../jest.global-setup.js');
    // look for tmp/tc-db.json under package root
    const rootTmp = path.resolve(__dirname, '../../tmp', 'tc-db.json');
    if (fs.existsSync(rootTmp)) {
      const data = JSON.parse(fs.readFileSync(rootTmp, 'utf8'));
      if (data && data.databaseUrl) {
        return { databaseUrl: data.databaseUrl };
      }
    }
  } catch (err) {
    // ignore and fall back to starting our own container
  }

  const container = await new GenericContainer('postgres:16')
    .withEnvironment({
      POSTGRES_DB: 'tg_payment_tc',
      POSTGRES_USER: 'tc_user',
      POSTGRES_PASSWORD: 'tc_pass',
    })
    .withExposedPorts(5432)
    .start();
  const port = container.getMappedPort(5432);
  const host = container.getHost();
  const databaseUrl = `postgresql://tc_user:tc_pass@${host}:${port}/tg_payment_tc`;

  // Run migrations (find repo-root `database/migrate.js` by walking up)
  try {
    let migrateScript: string | null = null;
    const dir = __dirname;
    for (let i = 0; i < 8; i++) {
      const candidate = path.resolve(dir, ...Array(i).fill('..'), 'database', 'migrate.js');
      if (fs.existsSync(candidate)) {
        migrateScript = candidate;
        break;
      }
    }
    if (!migrateScript) {
      // as a fallback, try the repo-root relative path
      const fallback = path.resolve(__dirname, '../../../../../../database/migrate.js');
      if (fs.existsSync(fallback)) migrateScript = fallback;
    }
    if (!migrateScript) {
      await container.stop();
      throw new Error('Could not locate database/migrate.js in repository');
    }
    execSync(`node ${migrateScript} up`, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
  } catch (err) {
    await container.stop();
    throw err;
  }

  return { container, databaseUrl };
}

export async function stopPostgresFixture(fixture: Fixture) {
  if (fixture.container) {
    await fixture.container.stop();
  }
}
