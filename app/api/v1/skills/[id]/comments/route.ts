// app/api/v1/skills/[id]/comments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkLimit, getIp, requireAuth, parsePagination } from '@/lib/api-helpers';
import { dispatchNotification } from '@/lib/notifications';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`GET /api/v1/skills/[id]/comments ${getIp(req)}`);
  if (limit) return limit;

  try {
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const { page, pageSize } = parsePagination(searchParams, 10);

    const [comments, total] = await prisma.$transaction([
      prisma.comment.findMany({
        where: { skillId: id },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          reactions: { select: { emoji: true, userId: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.comment.count({ where: { skillId: id } }),
    ]);

    const sanitized = comments.map((c) => ({
      ...c,
      content: c.deletedAt === null ? c.content : '[deleted]',
    }));

    return NextResponse.json({
      data: sanitized,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`POST /api/v1/skills/[id]/comments ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: { followers: true },
    });

    if (!skill) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    const body = (await req.json()) as { content?: string };
    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        skillId: id,
        authorId: session.user.id,
        content: body.content.trim(),
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const followerIds = skill.followers
      .map((f) => f.userId)
      .filter((uid) => uid !== session.user.id);

    if (followerIds.length > 0) {
      await dispatchNotification('NEW_COMMENT', followerIds, {
        skillId: id,
        skillName: skill.name,
        actorName: session.user.name ?? 'Someone',
        commentId: comment.id,
      });
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
