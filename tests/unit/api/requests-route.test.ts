// tests/unit/api/requests-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    changeRequest: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    skill: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock('@/lib/api-helpers', () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue('127.0.0.1'),
  requireAuth: vi.fn(),
  parsePagination: (sp: URLSearchParams, defaultPageSize = 12) => ({
    page: Math.max(1, Math.floor(Number(sp.get('page') ?? 1)) || 1),
    pageSize: Math.max(
      1,
      Math.min(100, Math.floor(Number(sp.get('pageSize') ?? defaultPageSize)) || defaultPageSize),
    ),
  }),
}));

vi.mock('@/lib/notifications', () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));

import { GET as getRequests, POST as postRequest } from '@/app/api/v1/skills/[id]/requests/route';
import {
  GET as getRequest,
  DELETE as withdrawRequest,
} from '@/app/api/v1/requests/[requestId]/route';
import { POST as approveRequest } from '@/app/api/v1/requests/[requestId]/approve/route';
import { POST as rejectRequest } from '@/app/api/v1/requests/[requestId]/reject/route';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkLimit } from '@/lib/api-helpers';
import { dispatchNotification } from '@/lib/notifications';

describe('GET /api/v1/skills/[id]/requests rate limit', () => {
  it('should return 429 when rate limited', async () => {
    const limitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests');
    const res = await getRequests(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe('POST /api/v1/skills/[id]/requests rate limit', () => {
  it('should return 429 when rate limited', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: 'u1' } } as never);
    const limitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
    });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests', {
      method: 'POST',
      body: JSON.stringify({ title: 't', description: 'd' }),
    });
    const res = await postRequest(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe('GET /api/v1/skills/[id]/requests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return paginated requests', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[{ id: 'r1', title: 'Fix' }], 1] as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests');
    const res = await getRequests(req, { params: Promise.resolve({ id: 's1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
  });

  it('should handle errors', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests');
    const res = await getRequests(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/v1/skills/[id]/requests', () => {
  const session = { user: { id: 'u1', name: 'Requester' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests', {
      method: 'POST',
      body: JSON.stringify({ title: 'Fix', description: 'desc' }),
    });
    const res = await postRequest(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(401);
  });

  it('should return 404 when skill not found', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests', {
      method: 'POST',
      body: JSON.stringify({ title: 'Fix', description: 'desc' }),
    });
    const res = await postRequest(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(404);
  });

  it('should return 400 when missing fields', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({ id: 's1', owners: [] } as never);
    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests', {
      method: 'POST',
      body: JSON.stringify({ title: '' }),
    });
    const res = await postRequest(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(400);
  });

  it('should create request and notify owners', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      name: 'skill',
      owners: [{ userId: 'o1' }],
    } as never);
    vi.mocked(prisma.changeRequest.create).mockResolvedValue({ id: 'r1' } as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests', {
      method: 'POST',
      body: JSON.stringify({ title: 'Fix typo', description: 'Found a typo' }),
    });
    const res = await postRequest(req, { params: Promise.resolve({ id: 's1' }) });

    expect(res.status).toBe(201);
    expect(dispatchNotification).toHaveBeenCalledWith(
      'CHANGE_REQUEST_SUBMITTED',
      ['o1'],
      expect.objectContaining({ requestId: 'r1' }),
    );
  });

  it('should create request without notifying when no owners', async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: 's1',
      name: 'skill',
      owners: [],
    } as never);
    vi.mocked(prisma.changeRequest.create).mockResolvedValue({ id: 'r1' } as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests', {
      method: 'POST',
      body: JSON.stringify({ title: 'Fix bug', description: 'There is a bug' }),
    });
    const res = await postRequest(req, { params: Promise.resolve({ id: 's1' }) });

    expect(res.status).toBe(201);
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
    vi.mocked(prisma.changeRequest.create).mockResolvedValue({ id: 'r1' } as never);

    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests', {
      method: 'POST',
      body: JSON.stringify({ title: 'Fix', description: 'desc' }),
    });
    await postRequest(req, { params: Promise.resolve({ id: 's1' }) });

    expect(dispatchNotification).toHaveBeenCalledWith(
      'CHANGE_REQUEST_SUBMITTED',
      ['o1'],
      expect.objectContaining({ actorName: 'Someone' }),
    );
  });

  it('should handle errors', async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/skills/s1/requests', {
      method: 'POST',
      body: JSON.stringify({ title: 'Fix', description: 'desc' }),
    });
    const res = await postRequest(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(500);
  });
});

describe('GET /api/v1/requests/[requestId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return request details', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: 'r1',
      title: 'Fix',
      skill: { id: 's1', name: 'skill' },
    } as never);

    const req = new NextRequest('http://localhost/api/v1/requests/r1');
    const res = await getRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('r1');
  });

  it('should return 404 when not found', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/v1/requests/r1');
    const res = await getRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(404);
  });

  it('should handle errors', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/requests/r1');
    const res = await getRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/v1/requests/[requestId] (withdraw)', () => {
  const session = { user: { id: 'u1', role: 'USER' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/requests/r1', { method: 'DELETE' });
    const res = await withdrawRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(401);
  });

  it('should return 404 when not found', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/v1/requests/r1', { method: 'DELETE' });
    const res = await withdrawRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(404);
  });

  it('should return 403 when not requester and not admin', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: 'r1',
      requesterId: 'other',
      status: 'OPEN',
    } as never);
    const req = new NextRequest('http://localhost/api/v1/requests/r1', { method: 'DELETE' });
    const res = await withdrawRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(403);
  });

  it('should return 400 when not OPEN', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: 'r1',
      requesterId: 'u1',
      status: 'APPROVED',
    } as never);
    const req = new NextRequest('http://localhost/api/v1/requests/r1', { method: 'DELETE' });
    const res = await withdrawRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(400);
  });

  it('should withdraw OPEN request', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: 'r1',
      requesterId: 'u1',
      status: 'OPEN',
    } as never);
    vi.mocked(prisma.changeRequest.update).mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost/api/v1/requests/r1', { method: 'DELETE' });
    const res = await withdrawRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.withdrawn).toBe(true);
  });

  it('should handle errors', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/requests/r1', { method: 'DELETE' });
    const res = await withdrawRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/v1/requests/[requestId]/approve', () => {
  const session = { user: { id: 'u1', name: 'Owner', role: 'USER' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/requests/r1/approve', { method: 'POST' });
    const res = await approveRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(401);
  });

  it('should approve request via transaction', async () => {
    const updatedCr = { id: 'r1', status: 'APPROVED', requesterId: 'requester1', skillId: 's1' };
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const tx = {
        changeRequest: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'r1',
            status: 'OPEN',
            skillId: 's1',
            requesterId: 'requester1',
            skill: { owners: [{ userId: 'u1' }] },
          }),
          update: vi.fn().mockResolvedValue(updatedCr),
        },
        skill: { update: vi.fn() },
        $executeRaw: vi.fn(),
      };
      return (cb as (t: typeof tx) => Promise<unknown>)(tx);
    });
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: 'r1',
      requesterId: 'requester1',
      skillId: 's1',
    } as never);

    const req = new NextRequest('http://localhost/api/v1/requests/r1/approve', { method: 'POST' });
    const res = await approveRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });

    expect(res.status).toBe(200);
    expect(dispatchNotification).toHaveBeenCalledWith(
      'CHANGE_REQUEST_APPROVED',
      ['requester1'],
      expect.objectContaining({ requestId: 'r1' }),
    );
  });

  it('should return 404 when request not found in transaction', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const tx = {
        changeRequest: { findUnique: vi.fn().mockResolvedValue(null) },
      };
      return (cb as (t: typeof tx) => Promise<unknown>)(tx);
    });

    const req = new NextRequest('http://localhost/api/v1/requests/r1/approve', { method: 'POST' });
    const res = await approveRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(404);
  });

  it('should return 400 when request is not OPEN', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const tx = {
        changeRequest: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'r1',
            status: 'APPROVED',
            skill: { owners: [] },
          }),
        },
      };
      return (cb as (t: typeof tx) => Promise<unknown>)(tx);
    });

    const req = new NextRequest('http://localhost/api/v1/requests/r1/approve', { method: 'POST' });
    const res = await approveRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(400);
  });

  it('should return 403 when not owner and not admin', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const tx = {
        changeRequest: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'r1',
            status: 'OPEN',
            skill: { owners: [{ userId: 'other' }] },
          }),
        },
      };
      return (cb as (t: typeof tx) => Promise<unknown>)(tx);
    });

    const req = new NextRequest('http://localhost/api/v1/requests/r1/approve', { method: 'POST' });
    const res = await approveRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(403);
  });

  it('should handle errors', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/requests/r1/approve', { method: 'POST' });
    const res = await approveRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/v1/requests/[requestId]/reject', () => {
  const session = { user: { id: 'u1', name: 'Owner', role: 'USER' }, expires: '' };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/v1/requests/r1/reject', { method: 'POST' });
    const res = await rejectRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(401);
  });

  it('should return 404 when not found', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/v1/requests/r1/reject', { method: 'POST' });
    const res = await rejectRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(404);
  });

  it('should return 400 when not OPEN', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: 'r1',
      status: 'APPROVED',
      skill: { owners: [] },
    } as never);
    const req = new NextRequest('http://localhost/api/v1/requests/r1/reject', { method: 'POST' });
    const res = await rejectRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(400);
  });

  it('should return 403 when not owner and not admin', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: 'r1',
      status: 'OPEN',
      skill: { owners: [{ userId: 'other' }] },
    } as never);
    const req = new NextRequest('http://localhost/api/v1/requests/r1/reject', { method: 'POST' });
    const res = await rejectRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(403);
  });

  it('should reject request and notify requester', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: 'r1',
      status: 'OPEN',
      requesterId: 'req1',
      skillId: 's1',
      skill: { name: 'skill', owners: [{ userId: 'u1' }] },
    } as never);
    vi.mocked(prisma.changeRequest.update).mockResolvedValue({
      id: 'r1',
      status: 'REJECTED',
    } as never);

    const req = new NextRequest('http://localhost/api/v1/requests/r1/reject', { method: 'POST' });
    const res = await rejectRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });

    expect(res.status).toBe(200);
    expect(dispatchNotification).toHaveBeenCalledWith(
      'CHANGE_REQUEST_REJECTED',
      ['req1'],
      expect.objectContaining({ requestId: 'r1' }),
    );
  });

  it('should handle errors', async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/v1/requests/r1/reject', { method: 'POST' });
    const res = await rejectRequest(req, { params: Promise.resolve({ requestId: 'r1' }) });
    expect(res.status).toBe(500);
  });
});
