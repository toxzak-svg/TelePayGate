import { Telegraf } from "telegraf";
import { PRODUCTS } from "../src/products";

describe("Storefront", () => {
  test("products list includes 3-5 items", () => {
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(3);
    expect(PRODUCTS.length).toBeLessThanOrEqual(5);
  });

  test("prices are in XTR smallest units", () => {
    for (const p of PRODUCTS) {
      expect(Number.isInteger(p.amount)).toBe(true);
      expect(p.amount).toBeGreaterThan(0);
    }
  });
});

describe("Bot handlers", () => {
  test("Telegraf can be instantiated with token", () => {
    const token = process.env.TELEGRAM_BOT_TOKEN || "dummy";
    const bot = new Telegraf(token);
    expect(bot).toBeDefined();
  });
});

