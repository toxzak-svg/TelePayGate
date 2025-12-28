import "dotenv/config";
import serverless from "serverless-http";
import { initDatabase } from "telepaygate-core";
import createServer from "./src/server";

let cachedHandler: any;
let initialized = false;

async function getHandler() {
  if (!initialized) {
    const DATABASE_URL =
      process.env.DATABASE_URL ||
      "postgresql://tg_user:tg_pass@localhost:5432/telepaygate_dev";
    await initDatabase(DATABASE_URL);
    const app = createServer();
    cachedHandler = serverless(app);
    initialized = true;
  }
  return cachedHandler;
}

export default async (req: any, res: any) => {
  const handler = await getHandler();
  return handler(req, res);
};
