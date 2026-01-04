import "dotenv/config";
import serverless from "serverless-http";
import createServer from "./src/server";

let cachedHandler: any;
let initialized = false;

async function getHandler() {
  if (!initialized) {
    // Initialize app without database (database is lazy-loaded in connection.ts)
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
