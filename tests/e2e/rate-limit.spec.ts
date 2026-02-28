// tests/e2e/rate-limit.spec.ts
import { test, expect } from '@playwright/test';

// Use serial mode so both tests share the same burst window
test.describe.configure({ mode: 'serial' });

test.describe('Rate limiting', () => {
  test('rapid requests should eventually return 429', async ({ request }) => {
    // Wait for any previous rate-limit window to expire so our burst starts fresh
    await new Promise((r) => setTimeout(r, 1_100));

    // Fire many rapid requests to the same endpoint
    // Rate limit is 20 req/sec with 1-second window
    const responses = await Promise.all(
      Array.from({ length: 30 }, () => request.get('/api/v1/tags')),
    );
    const got429 = responses.some((r) => r.status() === 429);
    expect(got429).toBe(true);
  });

  test('429 response should include Retry-After header', async ({ request }) => {
    // Wait for any previous rate-limit window to expire so our burst starts fresh
    await new Promise((r) => setTimeout(r, 1_100));

    const responses = await Promise.all(
      Array.from({ length: 30 }, () => request.get('/api/v1/tags')),
    );
    const limited = responses.find((r) => r.status() === 429);
    expect(limited).toBeDefined();
    const retryAfter = limited!.headers()['retry-after'];
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });
});
