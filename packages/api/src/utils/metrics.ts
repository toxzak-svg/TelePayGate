import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

const registry = new Registry();

// Add default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register: registry });

// Custom metrics
export const paymentCounter = new Counter({
  name: "telepaygate_payments_total",
  help: "Total number of payments processed",
  labelNames: ["status"],
  registers: [registry],
});

export const conversionCounter = new Counter({
  name: "telepaygate_conversions_total",
  help: "Total number of conversions executed",
  labelNames: ["status", "provider"],
  registers: [registry],
});

export const requestDuration = new Histogram({
  name: "telepaygate_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [registry],
});

export const getMetrics = async () => {
  return await registry.metrics();
};

export const getContentType = () => {
  return registry.contentType;
};
