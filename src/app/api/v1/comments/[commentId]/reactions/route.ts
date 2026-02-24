// src/app/api/v1/comments/[commentId]/reactions/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import type { ReactionEmoji } from "@prisma/client";

type RouteParams = { params: Promise<{ commentId: string }> };

const VALID_EMOJIS = new Set<ReactionEmoji>([
  "THUMBS_UP", "THUMBS_DOWN", "LAUGH", "HOORAY", "CONFUSED", "HEART", "ROCKET", "EYES",
]);

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`POST /api/v1/comments/[commentId]/reactions ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { commentId } = await params;
    const body = await req.json() as { emoji?: string };

    if (!body.emoji || !VALID_EMOJIS.has(body.emoji as ReactionEmoji)) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    const emoji = body.emoji as ReactionEmoji;
    const comment = await prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const existing = await prisma.commentReaction.findFirst({
      where: { commentId, userId: session.user.id, emoji },
    });

    if (existing) {
      await prisma.commentReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ data: { toggled: false, emoji } });
    }

    await prisma.commentReaction.create({
      data: { commentId, userId: session.user.id, emoji },
    });

    return NextResponse.json({ data: { toggled: true, emoji } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
