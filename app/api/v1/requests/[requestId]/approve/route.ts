// app/api/v1/requests/[requestId]/approve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";

type RouteParams = { params: Promise<{ requestId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`POST /api/v1/requests/[requestId]/approve ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { requestId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const cr = await tx.changeRequest.findUnique({
        where: { id: requestId },
        include: { skill: { include: { owners: true } } },
      });

      if (!cr) return { error: "Not Found", status: 404 };
      if (cr.status !== "OPEN") return { error: "Request is not OPEN", status: 400 };

      const isOwner = cr.skill.owners.some((o) => o.userId === session.user.id);
      if (!isOwner && session.user.role !== "ADMIN") {
        return { error: "Forbidden", status: 403 };
      }

      // SELECT FOR UPDATE to prevent concurrent approvals
      await tx.$executeRaw`SELECT id FROM "Skill" WHERE id = ${cr.skillId} FOR UPDATE`;

      const updated = await tx.changeRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          resolvedById: session.user.id,
          resolvedAt: new Date(),
        },
      });

      await tx.skill.update({
        where: { id: cr.skillId },
        data: { version: { increment: 1 } },
      });

      return { data: { request: updated, skillName: cr.skill.name } };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const cr = await prisma.changeRequest.findUnique({ where: { id: requestId } });
    if (cr) {
      await dispatchNotification("CHANGE_REQUEST_APPROVED", [cr.requesterId], {
        skillId: cr.skillId,
        skillName: result.data.skillName,
        actorName: session.user.name ?? "Someone",
        requestId,
      });
    }

    return NextResponse.json({ data: result.data.request });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
