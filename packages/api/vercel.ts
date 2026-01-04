import "dotenv/config";
import serverless from "serverless-http";
import createServer from "./src/server";

let cachedHandler: any;

export default async (req: any, res: any) => {
  if (!cachedHandler) {
    const app = createServer();
    cachedHandler = serverless(app, {
      request: (request: any) => {
        // Parse body if it exists
        if (request.body && typeof request.body === 'string') {
          try {
            request.body = JSON.parse(request.body);
          } catch (e) {
            // Keep as is if not JSON
          }
        }
        return request;
      },
    });
  }
  return cachedHandler(req, res);
};
