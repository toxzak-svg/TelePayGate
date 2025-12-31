import { PostgreSqlContainer, StartedTestContainer } from "testcontainers";
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

  const pg = new PostgreSqlContainer("postgres:16")
    .withDatabase("telepaygate_tc")
    .withUsername("tc_user")
    .withPassword("tc_pass");

  const container = await pg.start();
  const port = container.getMappedPort(5432);
  const host = container.getHost();
  const databaseUrl = `postgresql://tc_user:tc_pass@${host}:${port}/telepaygate_tc`;

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
    execSync(`node ${migrateScript} up`, {
      stdio: "inherit",
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
