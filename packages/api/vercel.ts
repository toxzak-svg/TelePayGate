import "dotenv/config";
import { createServer } from "./src/server";

// Simple Vercel serverless handler
export default async function handler(req: any, res: any) {
  const app = createServer();
  
  // Set request body from Vercel's parsed body
  if (req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      // Keep as is if not JSON
    }
  }
  
  // Handle the request with Express
  app(req, res);
}
