// tests/unit/api/comment-reactions-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    comment: { findUnique: vi.fn() },
    commentReaction: {
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

import { POST } from '@/app/api/v1/comments/[commentId]/reactions/route';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkLimit } from '@/lib/api-helpers';

describe('POST /api/v1/comments/[commentId]/reactions rate limit', () => {
  it('should return rate limit response', async () => {
    const limitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest('http://localhost/api/v1/comments/c1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'HEART' }),
    });
    const res = await POST(req, { params: Promise.resolve({ commentId: 'c1' }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe('POST /api/v1/comments/[commentId]/reactions', () => {
  const session = { user: { id: 'u1', role: 'USER' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/comments/c1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'HEART' }),
    });
    const res = await POST(req, { params: Promise.resolve({ commentId: 'c1' }) });
    expect(res.status).toBe(401);
  });

  it('should return 400 for invalid emoji', async () => {
    const req = new NextRequest('http://localhost/api/v1/comments/c1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'INVALID' }),
    });
    const res = await POST(req, { params: Promise.resolve({ commentId: 'c1' }) });
    expect(res.status).toBe(400);
  });

  it('should return 400 when emoji is missing', async () => {
    const req = new NextRequest('http://localhost/api/v1/comments/c1/reactions', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ commentId: 'c1' }) });
    expect(res.status).toBe(400);
  });

  it('should return 404 when comment not found', async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/v1/comments/c1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'HEART' }),
    });
    const res = await POST(req, { params: Promise.resolve({ commentId: 'c1' }) });
    expect(res.status).toBe(404);
  });

  it('should toggle off existing reaction', async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({ id: 'c1', deletedAt: null } as never);
    vi.mocked(prisma.commentReaction.findFirst).mockResolvedValue({ id: 'r1' } as never);
    vi.mocked(prisma.commentReaction.delete).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost/api/v1/comments/c1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'HEART' }),
    });
    const res = await POST(req, { params: Promise.resolve({ commentId: 'c1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.toggled).toBe(false);
  });

  it('should create new reaction', async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({ id: 'c1', deletedAt: null } as never);
    vi.mocked(prisma.commentReaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.commentReaction.create).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost/api/v1/comments/c1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'THUMBS_UP' }),
    });
    const res = await POST(req, { params: Promise.resolve({ commentId: 'c1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.toggled).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(prisma.comment.findUnique).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/comments/c1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'HEART' }),
    });
    const res = await POST(req, { params: Promise.resolve({ commentId: 'c1' }) });
    expect(res.status).toBe(500);
  });
});
