import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

type Fixture = {
  container?: StartedTestContainer;
  databaseUrl?: string;
};

export async function startPostgresFixture(): Promise<Fixture> {
  // If a global Jest fixture wrote DB info, reuse it instead of starting
  // a new container. This allows shared global setup to control lifecycle.
  try {
    const _possible = path.resolve(__dirname, "../../jest.global-setup.js");
    // look for tmp/tc-db.json under package root
    const rootTmp = path.resolve(__dirname, "../../tmp", "tc-db.json");
    if (fs.existsSync(rootTmp)) {
      const data = JSON.parse(fs.readFileSync(rootTmp, "utf8"));
      if (data && data.databaseUrl) {
        return { databaseUrl: data.databaseUrl };
      }
    }
  } catch (err) {
    // ignore and fall back to starting our own container
  }

  const pg = new GenericContainer("postgres:16")
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_USER: "tc_user",
      POSTGRES_PASSWORD: "tc_pass",
      POSTGRES_DB: "telepaygate_tc",
    })
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
    .withStartupTimeout(120000);

  const container = await pg.start();
  const port = container.getMappedPort(5432);
  const host = container.getHost();
  // Use 127.0.0.1 instead of localhost for more consistent behavior in some environments
  const databaseUrl = `postgresql://tc_user:tc_pass@${host === 'localhost' ? '127.0.0.1' : host}:${port}/telepaygate_tc`;

  console.log(`[postgresFixture] Started container on ${databaseUrl}`);

  // Run migrations (find repo-root `database/migrate.js` by walking up)
  try {
    let migrateScript: string | null = null;
    const dir = __dirname;
    // Prefer CommonJS migrate.cjs to avoid ESM require issues
    for (let i = 0; i < 8; i++) {
      const candidateCjs = path.resolve(
        dir,
        ...Array(i).fill(".."),
        "database",
        "migrate.cjs",
      );
      if (fs.existsSync(candidateCjs)) {
        migrateScript = candidateCjs;
        break;
      }
      const candidateJs = path.resolve(
        dir,
        ...Array(i).fill(".."),
        "database",
        "migrate.js",
      );
      if (fs.existsSync(candidateJs)) {
        migrateScript = candidateJs;
        break;
      }
    }
    if (!migrateScript) {
      // as a fallback, try the repo-root relative paths
      const fallbackCjs = path.resolve(
        __dirname,
        "../../../../../../database/migrate.cjs",
      );
      if (fs.existsSync(fallbackCjs)) migrateScript = fallbackCjs;
      else {
        const fallbackJs = path.resolve(
          __dirname,
          "../../../../../../database/migrate.js",
        );
        if (fs.existsSync(fallbackJs)) migrateScript = fallbackJs;
      }
    }
    if (!migrateScript) {
      await container.stop();
      throw new Error("Could not locate database/migrate.js in repository");
    }
  // Run migrations with retry logic
  let retries = 5;
  while (retries > 0) {
    try {
      execSync(`node ${migrateScript} up`, {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: databaseUrl, DEBUG_MIGRATIONS: "true" },
      });
      break; // Success!
    } catch (err) {
      retries--;
      if (retries === 0) {
        await container.stop();
        throw err;
      }
      console.warn(`[postgresFixture] Migration failed, retrying in 2s... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return { container, databaseUrl };
} catch (err) {
    await container.stop();
    throw err;
  }
}

export async function stopPostgresFixture(fixture: Fixture) {
  if (fixture.container) {
    await fixture.container.stop();
  }
}
