// tests/unit/api/sse-routes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/sse', () => ({
  createSSEStream: vi.fn().mockReturnValue({ stream: new ReadableStream(), cleanup: vi.fn() }),
}));

vi.mock('@/lib/api-helpers', () => ({
  requireAuth: vi.fn(),
}));

import { GET as getStatsSse } from '@/app/api/v1/sse/stats/route';
import { GET as getFollowersSse } from '@/app/api/v1/sse/skills/[id]/followers/route';
import { GET as getNotificationsSse } from '@/app/api/v1/sse/notifications/route';
import { requireAuth } from '@/lib/api-helpers';
import { createSSEStream } from '@/lib/sse';

describe('GET /api/v1/sse/stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return SSE stream response', async () => {
    const req = new NextRequest('http://localhost/api/v1/sse/stats');
    const res = await getStatsSse(req);

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(createSSEStream).toHaveBeenCalledWith('global_stats');
  });
});

describe('GET /api/v1/sse/skills/[id]/followers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return SSE stream for skill followers', async () => {
    const req = new NextRequest('http://localhost/api/v1/sse/skills/s1/followers');
    const res = await getFollowersSse(req, { params: Promise.resolve({ id: 's1' }) });

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(createSSEStream).toHaveBeenCalledWith('skill_followers:s1');
  });
});

describe('GET /api/v1/sse/notifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/sse/notifications');
    const res = await getNotificationsSse(req);
    expect(res.status).toBe(401);
  });

  it('should return SSE stream for authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: 'u1' } } as never);
    const req = new NextRequest('http://localhost/api/v1/sse/notifications');
    const res = await getNotificationsSse(req);

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(createSSEStream).toHaveBeenCalledWith('notifications:u1');
  });
});
