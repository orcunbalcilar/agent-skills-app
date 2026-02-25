// src/app/api/v1/skills/[id]/owners/[userId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`DELETE /api/v1/skills/[id]/owners/[userId] ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, userId } = await params;
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: { owners: true },
    });

    if (!skill) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const isOwner = skill.owners.some((o) => o.userId === session.user.id);
    if (!isOwner && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetOwner = skill.owners.find((o) => o.userId === userId);
    if (!targetOwner) {
      return NextResponse.json({ error: "User is not an owner" }, { status: 404 });
    }

    await prisma.skillOwner.delete({
      where: { skillId_userId: { skillId: id, userId } },
    });

    await dispatchNotification("OWNER_REMOVED", [userId], {
      skillId: id,
      skillName: skill.name,
      actorName: session.user.name ?? "Someone",
    });

    const remainingOwners = skill.owners.filter((o) => o.userId !== userId);
    const isOrphaned = remainingOwners.length === 0;

    return NextResponse.json({ data: { removed: true, orphaned: isOrphaned } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
