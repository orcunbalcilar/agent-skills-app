// app/api/v1/notifications/read-all/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkLimit, getIp, requireAuth } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const limit = checkLimit(`POST /api/v1/notifications/read-all ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ data: { updated: result.count } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
