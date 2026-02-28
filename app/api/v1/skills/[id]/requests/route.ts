// app/api/v1/skills/[id]/requests/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkLimit, getIp, requireAuth, parsePagination } from '@/lib/api-helpers';
import { dispatchNotification } from '@/lib/notifications';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`GET /api/v1/skills/[id]/requests ${getIp(req)}`);
  if (limit) return limit;

  try {
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const { page, pageSize } = parsePagination(searchParams);

    const [requests, total] = await prisma.$transaction([
      prisma.changeRequest.findMany({
        where: { skillId: id },
        include: {
          requester: { select: { id: true, name: true, avatarUrl: true } },
          resolvedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.changeRequest.count({ where: { skillId: id } }),
    ]);

    return NextResponse.json({
      data: requests,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`POST /api/v1/skills/[id]/requests ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: { owners: true },
    });

    if (!skill) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    const body = (await req.json()) as { title?: string; description?: string };
    if (!body.title?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'title and description are required' }, { status: 400 });
    }

    const request = await prisma.changeRequest.create({
      data: {
        skillId: id,
        requesterId: session.user.id,
        title: body.title.trim(),
        description: body.description.trim(),
      },
    });

    const ownerIds = skill.owners.map((o) => o.userId);
    if (ownerIds.length > 0) {
      await dispatchNotification('CHANGE_REQUEST_SUBMITTED', ownerIds, {
        skillId: id,
        skillName: skill.name,
        actorName: session.user.name ?? 'Someone',
        requestId: request.id,
      });
    }

    return NextResponse.json({ data: request }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
