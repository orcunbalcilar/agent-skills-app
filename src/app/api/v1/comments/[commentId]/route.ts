// src/app/api/v1/comments/[commentId]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";

type RouteParams = { params: Promise<{ commentId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`PATCH /api/v1/comments/[commentId] ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { commentId } = await params;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment || comment.deletedAt !== null) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as { content?: string };
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: body.content.trim() },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`DELETE /api/v1/comments/[commentId] ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { commentId } = await params;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    if (session.user.role === "ADMIN") {
      // Hard delete by admin
      await prisma.comment.delete({ where: { id: commentId } });
    } else {
      if (comment.authorId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Soft delete by author
      await prisma.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      });
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
