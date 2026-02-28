// tests/unit/api/auth-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  handlers: {
    GET: vi.fn().mockResolvedValue(new Response('get-ok')),
    POST: vi.fn().mockResolvedValue(new Response('post-ok')),
  },
}));

import { GET, POST } from '@/app/api/auth/[...nextauth]/route';

describe('Auth route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export GET handler from auth', async () => {
    expect(GET).toBeDefined();
    expect(typeof GET).toBe('function');
  });

  it('should export POST handler from auth', async () => {
    expect(POST).toBeDefined();
    expect(typeof POST).toBe('function');
  });

  it('GET should delegate to auth handlers', async () => {
    const res = await GET(new Request('http://localhost/api/auth/session'), {} as never);
    expect(res).toBeInstanceOf(Response);
    const text = await res.text();
    expect(text).toBe('get-ok');
  });

  it('POST should delegate to auth handlers', async () => {
    const res = await POST(
      new Request('http://localhost/api/auth/callback/github', { method: 'POST' }),
      {} as never,
    );
    expect(res).toBeInstanceOf(Response);
    const text = await res.text();
    expect(text).toBe('post-ok');
  });
});
