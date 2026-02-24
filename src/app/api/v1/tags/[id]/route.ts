// src/app/api/v1/tags/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`DELETE /api/v1/tags/[id] ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const tag = await prisma.tag.findUnique({ where: { id } });

    if (!tag) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (tag.isSystem) {
      return NextResponse.json({ error: "Cannot delete a system tag" }, { status: 400 });
    }

    const inUse = await prisma.skillTag.count({ where: { tagId: id } });
    if (inUse > 0) {
      return NextResponse.json({ error: "Tag is currently in use" }, { status: 400 });
    }

    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
