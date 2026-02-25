// src/app/api/v1/requests/[requestId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";

type RouteParams = { params: Promise<{ requestId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`GET /api/v1/requests/[requestId] ${getIp(req)}`);
  if (limit) return limit;

  try {
    const { requestId } = await params;
    const request = await prisma.changeRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: { select: { id: true, name: true, avatarUrl: true } },
        resolvedBy: { select: { id: true, name: true } },
        skill: { select: { id: true, name: true } },
      },
    });

    if (!request) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    return NextResponse.json({ data: request });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`DELETE /api/v1/requests/[requestId] ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { requestId } = await params;
    const request = await prisma.changeRequest.findUnique({ where: { id: requestId } });

    if (!request) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (request.requesterId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (request.status !== "OPEN") {
      return NextResponse.json({ error: "Can only withdraw OPEN requests" }, { status: 400 });
    }

    await prisma.changeRequest.update({
      where: { id: requestId },
      data: { status: "WITHDRAWN" },
    });

    return NextResponse.json({ data: { withdrawn: true } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
