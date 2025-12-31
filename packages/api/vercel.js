"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const serverless_http_1 = __importDefault(require("serverless-http"));
const telepaygate_core_1 = require("telepaygate-core");
const server_1 = __importDefault(require("./src/server"));
let cachedHandler;
let initialized = false;
async function getHandler() {
    if (!initialized) {
        const DATABASE_URL = process.env.DATABASE_URL;
        if (DATABASE_URL) {
            try {
                await (0, telepaygate_core_1.initDatabase)(DATABASE_URL);
                console.log("[vercel] Database initialized");
            }
            catch (err) {
                console.warn("[vercel] Database initialization failed:", err?.message);
            }
        }
        else {
            console.warn("[vercel] DATABASE_URL not set; starting API without a database connection");
        }
        const app = (0, server_1.default)();
        cachedHandler = (0, serverless_http_1.default)(app);
        initialized = true;
    }
    return cachedHandler;
}
exports.default = async (req, res) => {
    const handler = await getHandler();
    return handler(req, res);
};
