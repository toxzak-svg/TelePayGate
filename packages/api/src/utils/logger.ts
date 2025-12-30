type LogArg = string | number | boolean | null | undefined | Record<string, unknown> | Array<unknown>;

export const logger = {
  info: (...args: LogArg[]) => console.log("[INFO]", ...args),
  error: (...args: LogArg[]) => console.error("[ERROR]", ...args),
  warn: (...args: LogArg[]) => console.warn("[WARN]", ...args),
  http: (...args: LogArg[]) => console.log("[HTTP]", ...args),
  debug: (...args: LogArg[]) => console.log("[DEBUG]", ...args),
};
