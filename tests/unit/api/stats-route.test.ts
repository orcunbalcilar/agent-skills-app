// tests/unit/api/stats-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    skill: { findUnique: vi.fn() },
    skillReaction: { groupBy: vi.fn() },
  },
}));

vi.mock('@/lib/api-helpers', () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

import { GET } from '@/app/api/v1/skills/[id]/stats/route';
import { prisma } from '@/lib/prisma';
import { checkLimit } from '@/lib/api-helpers';

describe('GET /api/v1/skills/[id]/stats rate limit', () => {
  it('should return 429 when rate limited', async () => {
    const limitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/stats');
    const res = await GET(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe('GET /api/v1/skills/[id]/stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 404 when skill not found', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/stats');
    const res = await GET(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(404);
  });

  it('should return skill stats with reaction counts', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      downloadCount: 10,
      forkCount: 3,
      _count: { followers: 5, comments: 8, changeRequests: 2 },
    } as never);
    vi.mocked(prisma.skillReaction.groupBy).mockResolvedValue([
      { emoji: 'HEART', _count: { emoji: 4 } },
      { emoji: 'ROCKET', _count: { emoji: 2 } },
    ] as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/stats');
    const res = await GET(req, { params: Promise.resolve({ id: 's1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.downloadCount).toBe(10);
    expect(body.data.forkCount).toBe(3);
    expect(body.data.followerCount).toBe(5);
    expect(body.data.commentCount).toBe(8);
    expect(body.data.changeRequestCount).toBe(2);
    expect(body.data.reactionCounts).toEqual({ HEART: 4, ROCKET: 2 });
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/skills/s1/stats');
    const res = await GET(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(500);
  });
});
