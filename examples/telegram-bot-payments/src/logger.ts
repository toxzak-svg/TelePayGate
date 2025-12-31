type LogArg =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | Array<unknown>;

export const logger = {
  info: (...args: LogArg[]) => console.log("[INFO]", ...args),
  error: (...args: LogArg[]) => console.error("[ERROR]", ...args),
  warn: (...args: LogArg[]) => console.warn("[WARN]", ...args),
  event: (name: string, data?: Record<string, unknown>) =>
    console.log("[EVENT]", name, data ?? {})
};

