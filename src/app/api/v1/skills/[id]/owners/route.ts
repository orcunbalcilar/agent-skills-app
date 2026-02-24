// src/app/api/v1/skills/[id]/owners/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`POST /api/v1/skills/[id]/owners ${getIp(req)}`);
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

    const isOwner = skill.owners.some((o) => o.userId === session.user.id);
    if (!isOwner && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as { userId?: string };
    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.skillOwner.upsert({
      where: { skillId_userId: { skillId: id, userId: body.userId } },
      update: {},
      create: { skillId: id, userId: body.userId },
    });

    await dispatchNotification("OWNER_ADDED", [body.userId], {
      skillId: id,
      skillName: skill.name,
      actorName: session.user.name ?? "Someone",
    });

    return NextResponse.json({ data: { added: true } }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
