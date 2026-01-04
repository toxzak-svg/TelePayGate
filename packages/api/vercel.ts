import "dotenv/config";
import { createServer } from "./src/server";

// Create app instance ONCE (not per request)
const app = createServer();

export default async function handler(req: any, res: any) {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🚀 Vercel handler START: ${req.method} ${req.url}`);
  console.log(`[${new Date().toISOString()}] Headers:`, JSON.stringify(req.headers, null, 2));
  
  try {
    // Set request body from Vercel's parsed body
    if (req.body && typeof req.body === 'string') {
      console.log(`[${new Date().toISOString()}] Parsing body as JSON string`);
      try {
        req.body = JSON.parse(req.body);
        console.log(`[${new Date().toISOString()}] Body parsed successfully`);
      } catch (e) {
        console.log(`[${new Date().toISOString()}] Body parsing failed, keeping as-is:`, e);
      }
    }
    
    console.log(`[${new Date().toISOString()}] Forwarding to Express app`);
    
    // Handle the request with Express
    app(req, res);
    
    // Log response completion
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ✅ Response sent: ${res.statusCode} (${duration}ms)`);
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] ❌ Handler error (${duration}ms):`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
