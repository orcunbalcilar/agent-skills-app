// app/api/v1/notifications/[id]/read/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkLimit, getIp, requireAuth } from '@/lib/api-helpers';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`PATCH /api/v1/notifications/[id]/read ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    await prisma.notification.update({ where: { id }, data: { read: true } });
    return NextResponse.json({ data: { read: true } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
