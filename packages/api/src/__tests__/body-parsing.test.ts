import request from "supertest";
import express from "express";

describe("Express JSON body parsing", () => {
  const app = express();
  app.use(express.json());
  app.post("/echo", (req, res) => {
    res.json({ received: req.body });
  });

  test("should parse JSON body", async () => {
    const payload = { foo: "bar", num: 42 };
    const res = await request(app)
      .post("/echo")
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.received).toEqual(payload);
  });
});
