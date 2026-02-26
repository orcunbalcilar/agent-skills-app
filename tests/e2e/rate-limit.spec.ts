// tests/e2e/rate-limit.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Rate limiting", () => {
  test("rapid requests should eventually return 429", async ({ request }) => {
    // Fire many rapid requests to the same endpoint
    // Rate limit is 20 req/sec with 1-second window
    let got429 = false;
    for (let i = 0; i < 50; i++) {
      const res = await request.get("/api/v1/tags");
      if (res.status() === 429) {
        got429 = true;
        break;
      }
    }
    expect(got429).toBe(true);
  });

  test("429 response should include Retry-After header", async ({ request }) => {
    for (let i = 0; i < 50; i++) {
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
