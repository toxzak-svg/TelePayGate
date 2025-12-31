// Shared test utilities for root tests
import supertest from "supertest";
import { AddressInfo } from "net";

export function getServerUrl(server: any): string {
  const addr = server.address && (server.address() as AddressInfo);
  if (!addr) return "http://localhost:3000";
  const port = addr.port || 3000;
  return `http://127.0.0.1:${port}`;
}

export function requestAgent(server: any) {
  const url = getServerUrl(server);
  return supertest(url);
}

export function extractTokenFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("token");
  } catch (e) {
    return null;
  }
}

export default { getServerUrl, requestAgent, extractTokenFromUrl };
