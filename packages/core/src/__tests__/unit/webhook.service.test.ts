import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { WebhookService } from "../../services/webhook.service";
import axios from "axios";
import crypto from "crypto";

jest.mock("axios");

describe("WebhookService", () => {
  const mockPool = {
    query: jest.fn() as any,
  };

  const webhookSecret = "test-secret";
  let service: WebhookService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WebhookService(mockPool as any, webhookSecret);
  });

  describe("queueEvent", () => {
    it("should insert event into database", async () => {
      const payload = { test: "data" };
      // Mock for queueEvent INSERT
      (mockPool.query as any).mockResolvedValueOnce({ rows: [{ id: "event-1" }] });
      // Mock for deliverEvent SELECT
      (mockPool.query as any).mockResolvedValueOnce({ rows: [{ id: "event-1", webhook_url: "http://test.com", payload: "{}" }] });
      
      await service.queueEvent("user-1", "https://example.com/webhook", "payment.received", payload);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO webhook_events"),
        expect.arrayContaining(["user-1", "https://example.com/webhook", "payment.received"])
      );
    });
  });

  describe("deliverEvent", () => {
    it("should successfully deliver event and update status", async () => {
      const eventId = "event-1";
      const eventPayload = { foo: "bar" };
      const eventRow = {
        id: eventId,
        user_id: "user-1",
        webhook_url: "https://example.com/webhook",
        payload: JSON.stringify(eventPayload),
        attempts: 0,
        max_attempts: 5,
        event: "test.event",
        signature: "test-signature",
        created_at: new Date()
      };

      (mockPool.query as any).mockResolvedValueOnce({ rows: [eventRow] }); // For SELECT call
      (axios.post as any).mockResolvedValueOnce({ status: 200 });
      (mockPool.query as any).mockResolvedValueOnce({}); // For markAsDelivered call

      await service.deliverEvent(eventId);

      expect(axios.post).toHaveBeenCalledWith(
        eventRow.webhook_url,
        expect.objectContaining({ 
          data: expect.objectContaining({ foo: "bar" }),
          event: "test.event"
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Webhook-Signature": "test-signature"
          })
        })
      );
    });

    it("should handle delivery failure and increment attempts", async () => {
      const eventId = "event-2";
      const eventRow = {
        id: eventId,
        user_id: "user-1",
        webhook_url: "https://example.com/webhook",
        payload: JSON.stringify({}),
        attempts: 0,
        max_attempts: 5,
        event: "test.event",
        signature: "test-signature",
        created_at: new Date()
      };

      (mockPool.query as any).mockResolvedValueOnce({ rows: [eventRow] });
      (axios.post as any).mockRejectedValueOnce(new Error("Connection timeout"));
      (mockPool.query as any).mockResolvedValueOnce({}); // For UPDATE attempts call

      await service.deliverEvent(eventId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE webhook_events"),
        expect.arrayContaining([1, expect.any(Date), "Connection timeout", eventId])
      );
    });
  });

  describe("signature verification", () => {
    it("should correctly generate and verify signature", () => {
      const payload = { amount: 100 };
      const signature = (service as any).generateSignature(payload);
      
      const isValid = service.verifySignature(payload, signature);
      expect(isValid).toBe(true);

      const fakeSignature = "0".repeat(signature.length);
      const isInvalid = service.verifySignature(payload, fakeSignature);
      expect(isInvalid).toBe(false);
    });
  });
});
