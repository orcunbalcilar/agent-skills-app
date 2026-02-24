// src/app/api/v1/skills/[id]/follow/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";
import { pgNotify } from "@/lib/sse";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`POST /api/v1/skills/[id]/follow ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: { owners: true },
    });

    if (!skill) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    await prisma.follower.upsert({
      where: { skillId_userId: { skillId: id, userId: session.user.id } },
      update: {},
      create: { skillId: id, userId: session.user.id },
    });

    const followerCount = await prisma.follower.count({ where: { skillId: id } });

    const ownerIds = skill.owners.map((o) => o.userId).filter((uid) => uid !== session.user.id);
    if (ownerIds.length > 0) {
      await dispatchNotification("NEW_FOLLOWER", ownerIds, {
        skillId: id,
        skillName: skill.name,
        actorName: session.user.name ?? "Someone",
      });
    }

    await pgNotify(
      `skill_followers:${id}`,
      JSON.stringify({ event: "follow", followerCount })
    );

    return NextResponse.json({ data: { following: true, followerCount } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`DELETE /api/v1/skills/[id]/follow ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    await prisma.follower.deleteMany({
      where: { skillId: id, userId: session.user.id },
    });

    const followerCount = await prisma.follower.count({ where: { skillId: id } });

    await pgNotify(
      `skill_followers:${id}`,
      JSON.stringify({ event: "unfollow", followerCount })
    );

    return NextResponse.json({ data: { following: false, followerCount } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
