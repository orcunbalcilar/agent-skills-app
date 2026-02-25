// src/app/api/v1/skills/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";
import type { Prisma } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`GET /api/v1/skills/[id] ${getIp(req)}`);
  if (limit) return limit;

  try {
    const { id } = await params;
    const session = await (await import("@/lib/auth")).auth();

    const skill = await prisma.skill.findUnique({
      where: { id },
      include: {
        owners: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        tags: { include: { tag: true } },
        reactions: true,
        followers: { select: { userId: true } },
        followerSnapshots: { orderBy: { snapshotDate: "asc" } },
        _count: { select: { comments: true, followers: true, changeRequests: true } },
      },
    });

    if (!skill) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    if (skill.status === "TEMPLATE") {
      const isOwner = skill.owners.some((o) => o.userId === session?.user?.id);
      const isAdmin = session?.user?.role === "ADMIN";
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const reactionCounts = skill.reactions.reduce<Record<string, number>>((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      data: { ...skill, reactionCounts },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`PATCH /api/v1/skills/[id] ${getIp(req)}`);
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
    if (skill.status === "RELEASED") {
      return NextResponse.json({ error: "Cannot edit a released skill" }, { status: 400 });
    }

    const isOwner = skill.owners.some((o) => o.userId === session.user.id);
    if (!isOwner && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      name?: string;
      description?: string;
      spec?: Record<string, unknown>;
      files?: Array<{ path: string; content: string }>;
      tags?: string[];
      editMessage?: string;
    };

    const updated = await prisma.$transaction(async (tx) => {
      // Snapshot current state as a version before updating
      await tx.skillVersion.create({
        data: {
          skillId: id,
          version: skill.version,
          spec: skill.spec as Prisma.InputJsonValue,
          files: skill.files as Prisma.InputJsonValue,
          editedById: session.user.id,
          message: body.editMessage ?? null,
        },
      });

      const s = await tx.skill.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.spec !== undefined && { spec: body.spec as Prisma.InputJsonValue }),
          ...(body.files !== undefined && { files: body.files as Prisma.InputJsonValue }),
          version: { increment: 1 },
        },
      });

      if (body.tags !== undefined) {
        await tx.skillTag.deleteMany({ where: { skillId: id } });
        // Support both tag IDs and tag names
        const byId = await tx.tag.findMany({ where: { id: { in: body.tags } } });
        const byName = await tx.tag.findMany({ where: { name: { in: body.tags } } });
        const found = [...byId, ...byName];
        const foundIds = new Set(found.map((t) => t.id));
        const foundNames = new Set(found.map((t) => t.name));
        const newTagNames = body.tags
          .filter((t) => !foundIds.has(t) && !foundNames.has(t))
          .slice(0, 10 - found.length);
        const createdTags = await Promise.all(
          newTagNames.map((name) => tx.tag.create({ data: { name } }))
        );
        const allTagIds = new Set([...found.map((t) => t.id), ...createdTags.map((t) => t.id)]);
        const allTags = [...allTagIds].slice(0, 10);
        await tx.skillTag.createMany({
          data: allTags.map((tagId) => ({ skillId: id, tagId })),
        });
      }

      return s;
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`DELETE /api/v1/skills/[id] ${getIp(req)}`);
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

    await prisma.skill.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
