import { RateLimiter } from "../src/rateLimiter";

describe("RateLimiter", () => {
  test("schedules calls within capacity", async () => {
    const limiter = new RateLimiter(2, 10);
    let count = 0;
    await limiter.schedule(async () => {
      count++;
    });
    await limiter.schedule(async () => {
      count++;
    });
    expect(count).toBe(2);
  });
});

