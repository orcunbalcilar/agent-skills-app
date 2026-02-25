// src/app/api/v1/skills/[id]/reactions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import type { ReactionEmoji } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`POST /api/v1/skills/[id]/reactions ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json() as { emoji?: string };

    if (!body.emoji) {
      return NextResponse.json({ error: "emoji is required" }, { status: 400 });
    }

    const validEmojis = new Set<ReactionEmoji>([
      "THUMBS_UP", "THUMBS_DOWN", "LAUGH", "HOORAY", "CONFUSED", "HEART", "ROCKET", "EYES",
    ]);

    if (!validEmojis.has(body.emoji as ReactionEmoji)) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    const emoji = body.emoji as ReactionEmoji;
    const existing = await prisma.skillReaction.findFirst({
      where: { skillId: id, userId: session.user.id, emoji },
    });

    if (existing) {
      await prisma.skillReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ data: { toggled: false, emoji } });
    }

    const skill = await prisma.skill.findUnique({ where: { id }, select: { id: true } });
    if (!skill) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    await prisma.skillReaction.create({
      data: { skillId: id, userId: session.user.id, emoji },
    });

    return NextResponse.json({ data: { toggled: true, emoji } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
