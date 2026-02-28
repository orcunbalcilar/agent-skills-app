// app/api/v1/notifications/preferences/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkLimit, getIp, requireAuth } from '@/lib/api-helpers';

export async function PATCH(req: NextRequest) {
  const limit = checkLimit(`PATCH /api/v1/notifications/preferences ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as Record<string, boolean>;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { notificationPreferences: body },
    });

    return NextResponse.json({ data: { updated: true } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
