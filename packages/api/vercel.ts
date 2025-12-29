import "dotenv/config";
import serverless from "serverless-http";
import { initDatabase } from "telepaygate-core";
import createServer from "./src/server";

let cachedHandler: any;
let initialized = false;

async function getHandler() {
  if (!initialized) {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (DATABASE_URL) {
      try {
        await initDatabase(DATABASE_URL);
        console.log("[vercel] Database initialized");
      } catch (err) {
        console.warn("[vercel] Database initialization failed:", (err as Error)?.message);
        // Proceed without DB so non-DB routes like /health still work
      }
    } else {
      console.warn("[vercel] DATABASE_URL not set; starting API without a database connection");
    }
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
