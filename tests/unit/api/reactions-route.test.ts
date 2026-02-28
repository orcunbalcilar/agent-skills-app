// tests/unit/api/reactions-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    skill: { findUnique: vi.fn() },
    skillReaction: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-helpers', () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue('127.0.0.1'),
  requireAuth: vi.fn(),
}));

import { POST } from '@/app/api/v1/skills/[id]/reactions/route';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkLimit } from '@/lib/api-helpers';

describe('POST /api/v1/skills/[id]/reactions rate limit', () => {
  it('should return rate limit response', async () => {
    const limitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'HEART' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe('POST /api/v1/skills/[id]/reactions', () => {
  const session = { user: { id: 'u1' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'HEART' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(401);
  });

  it('should return 400 when emoji is missing', async () => {
    const req = new NextRequest('http://localhost/api/v1/skills/s1/reactions', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid emoji', async () => {
    const req = new NextRequest('http://localhost/api/v1/skills/s1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'INVALID' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(400);
  });

  it('should toggle off existing reaction', async () => {
    vi.mocked(prisma.skillReaction.findFirst).mockResolvedValue({ id: 'r1' } as never);
    vi.mocked(prisma.skillReaction.delete).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'HEART' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.toggled).toBe(false);
  });

  it('should return 404 when skill not found for new reaction', async () => {
    vi.mocked(prisma.skillReaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'ROCKET' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(404);
  });

  it('should create new reaction', async () => {
    vi.mocked(prisma.skillReaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({ id: 's1' } as never);
    vi.mocked(prisma.skillReaction.create).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'THUMBS_UP' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.toggled).toBe(true);
  });

  it('should handle all valid emojis', async () => {
    const validEmojis = [
      'THUMBS_UP',
      'THUMBS_DOWN',
      'LAUGH',
      'HOORAY',
      'CONFUSED',
      'HEART',
      'ROCKET',
      'EYES',
    ];
    for (const emoji of validEmojis) {
      vi.mocked(prisma.skillReaction.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.skill.findUnique).mockResolvedValue({ id: 's1' } as never);
      vi.mocked(prisma.skillReaction.create).mockResolvedValue({} as never);

      const req = new NextRequest('http://localhost/api/v1/skills/s1/reactions', {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
      const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
      expect(res.status).toBe(200);
    }
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(prisma.skillReaction.findFirst).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/skills/s1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'HEART' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(500);
  });
});
