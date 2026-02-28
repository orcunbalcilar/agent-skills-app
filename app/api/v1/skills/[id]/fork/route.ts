// app/api/v1/skills/[id]/fork/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkLimit, getIp, requireAuth } from '@/lib/api-helpers';
import { dispatchNotification } from '@/lib/notifications';
import { pgNotify } from '@/lib/sse';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`POST /api/v1/skills/[id]/fork ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const parent = await prisma.skill.findUnique({
      where: { id },
      include: { owners: true, tags: true },
    });

    if (!parent) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    if (parent.status !== 'RELEASED') {
      return NextResponse.json({ error: 'Can only fork released skills' }, { status: 400 });
    }

    const [fork] = await prisma.$transaction([
      prisma.skill.create({
        data: {
          name: `${parent.name}-fork`,
          description: parent.description,
          spec: parent.spec as Parameters<typeof prisma.skill.create>[0]['data']['spec'],
          status: 'TEMPLATE',
          version: 1,
          forkedFromId: id,
        },
      }),
      prisma.skill.update({
        where: { id },
        data: { forkCount: { increment: 1 } },
      }),
    ]);

    await prisma.skillOwner.create({
      data: { skillId: fork.id, userId: session.user.id },
    });

    if (parent.tags.length > 0) {
      await prisma.skillTag.createMany({
        data: parent.tags.map((st) => ({ skillId: fork.id, tagId: st.tagId })),
      });
    }

    const ownerIds = parent.owners.map((o) => o.userId);
    if (ownerIds.length > 0) {
      await dispatchNotification('SKILL_FORKED', ownerIds, {
        skillId: id,
        skillName: parent.name,
        actorName: session.user.name ?? 'Someone',
        forkId: fork.id,
      });
    }

    await Promise.all([
      pgNotify('global_stats', JSON.stringify({ event: 'skill_forked', skillId: id })),
      pgNotify(
        `skill_followers:${id}`,
        JSON.stringify({ event: 'fork', forkCount: parent.forkCount + 1 }),
      ),
    ]);

    return NextResponse.json({ data: fork }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
