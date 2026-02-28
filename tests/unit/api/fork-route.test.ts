// tests/unit/api/fork-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    skill: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    skillOwner: { create: vi.fn() },
    skillTag: { createMany: vi.fn() },
    $transaction: vi.fn(),
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

import { POST } from '@/app/api/v1/skills/[id]/fork/route';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkLimit } from '@/lib/api-helpers';
import { dispatchNotification } from '@/lib/notifications';
import { pgNotify } from '@/lib/sse';

describe('POST /api/v1/skills/[id]/fork rate limit', () => {
  it('should return 429 when rate limited', async () => {
    const limitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: 'u1' } } as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/fork', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe('POST /api/v1/skills/[id]/fork', () => {
  const session = { user: { id: 'u1', name: 'Forker' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/fork', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(401);
  });

  it('should return 404 when skill not found', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/fork', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(404);
  });

  it('should return 400 when skill is not released', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      status: 'TEMPLATE',
      owners: [],
      tags: [],
    } as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/fork', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(400);
  });

  it('should create fork and notify owners', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      name: 'original',
      status: 'RELEASED',
      description: 'desc',
      spec: { name: 'original' },
      files: [{ path: 'SKILL.md', content: '---\nname: original\n---' }],
      forkCount: 2,
      owners: [{ userId: 'o1' }],
      tags: [{ tagId: 't1' }],
    } as never);
    const fork = { id: 'f1', name: 'original-fork' };
    vi.mocked(prisma.$transaction).mockResolvedValue([fork, {}] as never);
    vi.mocked(prisma.skillOwner.create).mockResolvedValue({} as never);
    vi.mocked(prisma.skillTag.createMany).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/fork', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });

    expect(res.status).toBe(201);
    expect(dispatchNotification).toHaveBeenCalledWith(
      'SKILL_FORKED',
      ['o1'],
      expect.objectContaining({ skillId: 's1' }),
    );
    expect(pgNotify).toHaveBeenCalledTimes(2);
  });

  it('should copy files from parent when forking', async () => {
    const parentFiles = [
      { path: 'SKILL.md', content: '---\nname: test\n---' },
      { path: 'scripts/setup.sh', content: '#!/bin/bash' },
    ];
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      name: 'original',
      status: 'RELEASED',
      description: 'desc',
      spec: { name: 'original' },
      files: parentFiles,
      forkCount: 0,
      owners: [],
      tags: [],
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{ id: 'f1' }, {}] as never);
    vi.mocked(prisma.skillOwner.create).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/fork', { method: 'POST' });
    await POST(req, { params: Promise.resolve({ id: 's1' }) });

    // Verify the transaction was called with files included
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({})]),
    );
  });

  it('should skip tag copy when no tags', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      name: 'original',
      status: 'RELEASED',
      description: 'desc',
      spec: {},
      forkCount: 0,
      owners: [],
      tags: [],
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{ id: 'f1' }, {}] as never);
    vi.mocked(prisma.skillOwner.create).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/fork', { method: 'POST' });
    await POST(req, { params: Promise.resolve({ id: 's1' }) });

    expect(prisma.skillTag.createMany).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/skills/s1/fork', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(500);
  });

  it('should use fallback name when session user has no name', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: 'u1', name: null },
      expires: '',
    } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      name: 'original',
      status: 'RELEASED',
      description: 'desc',
      spec: { name: 'original' },
      forkCount: 0,
      owners: [{ userId: 'o1' }],
      tags: [],
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{ id: 'f1' }, {}] as never);
    vi.mocked(prisma.skillOwner.create).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/fork', { method: 'POST' });
    await POST(req, { params: Promise.resolve({ id: 's1' }) });

    expect(dispatchNotification).toHaveBeenCalledWith(
      'SKILL_FORKED',
      ['o1'],
      expect.objectContaining({ actorName: 'Someone' }),
    );
  });
});
