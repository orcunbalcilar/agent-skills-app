// tests/unit/api/notification-actions-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { updateMany: vi.fn() },
    user: { update: vi.fn() },
  },
}));

vi.mock('@/lib/api-helpers', () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue('127.0.0.1'),
  requireAuth: vi.fn(),
}));

import { POST as readAll } from '@/app/api/v1/notifications/read-all/route';
import { PATCH as updatePrefs } from '@/app/api/v1/notifications/preferences/route';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkLimit } from '@/lib/api-helpers';

describe('Rate limit tests', () => {
  it('should return rate limit for read-all', async () => {
    const limitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest('http://localhost/api/v1/notifications/read-all', {
      method: 'POST',
    });
    const res = await readAll(req);
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it('should return rate limit for preferences', async () => {
    const limitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest('http://localhost/api/v1/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    const res = await updatePrefs(req);
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe('POST /api/v1/notifications/read-all', () => {
  const session = { user: { id: 'u1' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/notifications/read-all', {
      method: 'POST',
    });
    const res = await readAll(req);
    expect(res.status).toBe(401);
  });

  it('should mark all notifications as read', async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 } as never);

    const req = new NextRequest('http://localhost/api/v1/notifications/read-all', {
      method: 'POST',
    });
    const res = await readAll(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.updated).toBe(5);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', read: false },
      data: { read: true },
    });
  });

  it('should handle errors', async () => {
    vi.mocked(prisma.notification.updateMany).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/notifications/read-all', {
      method: 'POST',
    });
    const res = await readAll(req);
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/v1/notifications/preferences', () => {
  const session = { user: { id: 'u1' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ NEW_COMMENT: false }),
    });
    const res = await updatePrefs(req);
    expect(res.status).toBe(401);
  });

  it('should update notification preferences', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost/api/v1/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ NEW_COMMENT: false, NEW_FOLLOWER: true }),
    });
    const res = await updatePrefs(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.updated).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { notificationPreferences: { NEW_COMMENT: false, NEW_FOLLOWER: true } },
    });
  });

  it('should handle errors', async () => {
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ NEW_COMMENT: false }),
    });
    const res = await updatePrefs(req);
    expect(res.status).toBe(500);
  });
});
