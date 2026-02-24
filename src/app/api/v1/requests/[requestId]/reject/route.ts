// src/app/api/v1/requests/[requestId]/reject/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";

type RouteParams = { params: Promise<{ requestId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`POST /api/v1/requests/[requestId]/reject ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { requestId } = await params;
    const cr = await prisma.changeRequest.findUnique({
      where: { id: requestId },
      include: { skill: { include: { owners: true } } },
    });

    if (!cr) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (cr.status !== "OPEN") {
      return NextResponse.json({ error: "Request is not OPEN" }, { status: 400 });
    }

    const isOwner = cr.skill.owners.some((o) => o.userId === session.user.id);
    if (!isOwner && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.changeRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        resolvedById: session.user.id,
        resolvedAt: new Date(),
      },
    });

    await dispatchNotification("CHANGE_REQUEST_REJECTED", [cr.requesterId], {
      skillId: cr.skillId,
      skillName: cr.skill.name,
      actorName: session.user.name ?? "Someone",
      requestId,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
