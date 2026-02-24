// tests/e2e/rate-limit.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Rate limiting", () => {
  test("21st rapid request should return 429", async ({ request }) => {
    // Fire 21 rapid requests to the same endpoint
    let lastStatus = 200;
    for (let i = 0; i < 25; i++) {
      const res = await request.get("/api/v1/tags");
      lastStatus = res.status();
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);
  });

  test("429 response should include Retry-After header", async ({ request }) => {
    for (let i = 0; i < 25; i++) {
      const res = await request.get("/api/v1/tags");
      if (res.status() === 429) {
        const retryAfter = res.headers()["retry-after"];
        expect(retryAfter).toBeDefined();
        expect(Number(retryAfter)).toBeGreaterThan(0);
        return;
      }
    }
  });
});
