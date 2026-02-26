// app/api/v1/skills/[id]/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp } from "@/lib/api-helpers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`GET /api/v1/skills/[id]/stats ${getIp(req)}`);
  if (limit) return limit;

  try {
    const { id } = await params;
    const skill = await prisma.skill.findUnique({
      where: { id },
      select: {
        downloadCount: true,
        forkCount: true,
        _count: {
          select: {
            followers: true,
            comments: { where: { deletedAt: null } },
            changeRequests: true,
          },
        },
      },
    });

    if (!skill) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const reactions = await prisma.skillReaction.groupBy({
      by: ["emoji"],
      where: { skillId: id },
      _count: { emoji: true },
    });

    const reactionCounts = Object.fromEntries(
      reactions.map((r) => [r.emoji, r._count.emoji])
    );

    return NextResponse.json({
      data: {
        downloadCount: skill.downloadCount,
        forkCount: skill.forkCount,
        followerCount: skill._count.followers,
        commentCount: skill._count.comments,
        changeRequestCount: skill._count.changeRequests,
        reactionCounts,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
