import { PostgresContainer, StartedTestContainer } from 'testcontainers';
import { execSync } from 'child_process';
import path from 'path';

type Fixture = {
  container?: StartedTestContainer;
  databaseUrl?: string;
};

export async function startPostgresFixture(): Promise<Fixture> {
  const pg = new PostgresContainer('postgres:16')
    .withDatabase('tg_payment_tc')
    .withUsername('tc_user')
    .withPassword('tc_pass');

  const container = await pg.start();
  const port = container.getMappedPort(5432);
  const host = container.getHost();
  const databaseUrl = `postgresql://tc_user:tc_pass@${host}:${port}/tg_payment_tc`;

  // Run migrations (uses repo-root database/migrate.js)
  try {
    const migrateScript = path.resolve(__dirname, '../../../../database/migrate.js');
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
