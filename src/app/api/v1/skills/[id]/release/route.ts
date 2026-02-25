// src/app/api/v1/skills/[id]/release/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";
import { pgNotify } from "@/lib/sse";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`POST /api/v1/skills/[id]/release ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: { owners: true, followers: true },
    });

    if (!skill) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (skill.status === "RELEASED") {
      return NextResponse.json({ error: "Skill is already released" }, { status: 400 });
    }

    const isOwner = skill.owners.some((o) => o.userId === session.user.id);
    if (!isOwner && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const released = await prisma.skill.update({
      where: { id },
      data: {
        status: "RELEASED",
        releasedAt: new Date(),
        version: 1,
      },
    });

    const followerIds = skill.followers.map((f) => f.userId);
    if (followerIds.length > 0) {
      await dispatchNotification("SKILL_RELEASED", followerIds, {
        skillId: id,
        skillName: skill.name,
        actorName: session.user.name ?? "Someone",
      });
    }

    await pgNotify("global_stats", JSON.stringify({ event: "skill_released", skillId: id }));

    return NextResponse.json({ data: released });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
