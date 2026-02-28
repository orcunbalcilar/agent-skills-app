// tests/unit/api/follow-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    skill: { findUnique: vi.fn() },
    follower: {
      upsert: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-helpers', () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue('127.0.0.1'),
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/sse', () => ({
  pgNotify: vi.fn().mockResolvedValue(undefined),
}));

import { POST, DELETE } from '@/app/api/v1/skills/[id]/follow/route';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkLimit } from '@/lib/api-helpers';
import { dispatchNotification } from '@/lib/notifications';
import { pgNotify } from '@/lib/sse';

describe('POST /api/v1/skills/[id]/follow rate limit', () => {
  it('should return rate limit for POST', async () => {
    const limitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it('should return rate limit for DELETE', async () => {
    const limitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe('POST /api/v1/skills/[id]/follow', () => {
  const session = { user: { id: 'u1', name: 'User' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(401);
  });

  it('should return 404 when skill not found', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(404);
  });

  it('should follow skill and notify owners', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      name: 'skill',
      owners: [{ userId: 'o1' }],
    } as never);
    vi.mocked(prisma.follower.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.follower.count).mockResolvedValue(5);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.following).toBe(true);
    expect(body.data.followerCount).toBe(5);
    expect(dispatchNotification).toHaveBeenCalledWith(
      'NEW_FOLLOWER',
      ['o1'],
      expect.objectContaining({ skillId: 's1' }),
    );
    expect(pgNotify).toHaveBeenCalled();
  });

  it('should not notify self when following own skill', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      name: 'skill',
      owners: [{ userId: 'u1' }],
    } as never);
    vi.mocked(prisma.follower.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.follower.count).mockResolvedValue(1);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'POST' });
    await POST(req, { params: Promise.resolve({ id: 's1' }) });

    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it('should skip notification when no owners', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      name: 'skill',
      owners: [],
    } as never);
    vi.mocked(prisma.follower.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.follower.count).mockResolvedValue(1);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });

    expect(res.status).toBe(200);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it('should use fallback name when session user has no name', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: 'u1', name: null },
      expires: '',
    } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      name: 'skill',
      owners: [{ userId: 'o1' }],
    } as never);
    vi.mocked(prisma.follower.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.follower.count).mockResolvedValue(2);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'POST' });
    await POST(req, { params: Promise.resolve({ id: 's1' }) });

    expect(dispatchNotification).toHaveBeenCalledWith(
      'NEW_FOLLOWER',
      ['o1'],
      expect.objectContaining({ actorName: 'Someone' }),
    );
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/v1/skills/[id]/follow', () => {
  const session = { user: { id: 'u1' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(401);
  });

  it('should unfollow skill', async () => {
    vi.mocked(prisma.follower.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.follower.count).mockResolvedValue(3);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 's1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.following).toBe(false);
    expect(body.data.followerCount).toBe(3);
    expect(pgNotify).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(prisma.follower.deleteMany).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/skills/s1/follow', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(500);
  });
});
