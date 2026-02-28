// lib/api-helpers.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too Many Requests' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    },
  );
}

export function checkLimit(key: string): NextResponse | null {
  const { allowed, retryAfter } = rateLimit(key);
  if (!allowed) return rateLimitResponse(retryAfter);
  return null;
}

export function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') ?? 'unknown';
}

export type AuthedSession = Session & { user: NonNullable<Session['user']> & { id: string } };

export async function requireAuth(): Promise<AuthedSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session as AuthedSession;
}

export function parsePagination(searchParams: URLSearchParams, defaultPageSize = 12) {
  const page = Math.max(1, Math.floor(Number(searchParams.get('page') ?? 1)) || 1);
  const pageSize = Math.max(
    1,
    Math.min(
      100,
      Math.floor(Number(searchParams.get('pageSize') ?? defaultPageSize)) || defaultPageSize,
    ),
  );
  return { page, pageSize };
}
