// tests/unit/lib/api-helpers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import {
  checkLimit,
  getIp,
  rateLimitResponse,
  requireAuth,
  parsePagination,
} from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';

describe('rateLimitResponse', () => {
  it('should return 429 with Retry-After header', () => {
    const response = rateLimitResponse(5);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('5');
  });
});

describe('checkLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when under limit', () => {
    vi.mocked(rateLimit).mockReturnValue({ allowed: true, retryAfter: 0 });
    expect(checkLimit('key')).toBeNull();
  });

  it('should return 429 response when rate limited', () => {
    vi.mocked(rateLimit).mockReturnValue({ allowed: false, retryAfter: 3 });
    const result = checkLimit('key');
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
  });
});

describe('getIp', () => {
  it('should extract IP from x-forwarded-for', () => {
    const req = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(getIp(req)).toBe('10.0.0.1');
  });

  it("should return 'unknown' when no header", () => {
    const req = new NextRequest('http://localhost');
    expect(getIp(req)).toBe('unknown');
  });
});

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const result = await requireAuth();
    expect(result).toBeNull();
  });

  it('should return null when user has no id', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: 'a@b.com' }, expires: '' } as never);
    const result = await requireAuth();
    expect(result).toBeNull();
  });

  it('should return session when authenticated with id', async () => {
    const session = { user: { id: 'u1', name: 'Test' }, expires: '' };
    vi.mocked(auth).mockResolvedValue(session as never);
    const result = await requireAuth();
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe('u1');
  });
});

describe('parsePagination', () => {
  it('should return defaults with empty params', () => {
    const sp = new URLSearchParams();
    expect(parsePagination(sp)).toEqual({ page: 1, pageSize: 12 });
  });

  it('should respect custom default page size', () => {
    const sp = new URLSearchParams();
    expect(parsePagination(sp, 20)).toEqual({ page: 1, pageSize: 20 });
  });

  it('should parse valid page and pageSize', () => {
    const sp = new URLSearchParams({ page: '3', pageSize: '25' });
    expect(parsePagination(sp)).toEqual({ page: 3, pageSize: 25 });
  });

  it('should clamp negative page to 1', () => {
    const sp = new URLSearchParams({ page: '-5' });
    expect(parsePagination(sp).page).toBe(1);
  });

  it('should clamp zero page to 1', () => {
    const sp = new URLSearchParams({ page: '0' });
    expect(parsePagination(sp).page).toBe(1);
  });

  it('should clamp pageSize to max 100', () => {
    const sp = new URLSearchParams({ pageSize: '500' });
    expect(parsePagination(sp).pageSize).toBe(100);
  });

  it('should clamp pageSize to min 1', () => {
    const sp = new URLSearchParams({ pageSize: '0' });
    expect(parsePagination(sp).pageSize).toBe(12);
  });

  it('should handle NaN page gracefully', () => {
    const sp = new URLSearchParams({ page: 'abc' });
    expect(parsePagination(sp).page).toBe(1);
  });

  it('should handle NaN pageSize gracefully', () => {
    const sp = new URLSearchParams({ pageSize: 'xyz' });
    expect(parsePagination(sp).pageSize).toBe(12);
  });

  it('should floor decimal values', () => {
    const sp = new URLSearchParams({ page: '2.7', pageSize: '15.9' });
    expect(parsePagination(sp)).toEqual({ page: 2, pageSize: 15 });
  });
});
