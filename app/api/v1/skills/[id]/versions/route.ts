// app/api/v1/skills/[id]/versions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp } from "@/lib/api-helpers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`GET /api/v1/skills/[id]/versions ${getIp(req)}`);
  if (limit) return limit;

  try {
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 20);

    const [versions, total] = await Promise.all([
      prisma.skillVersion.findMany({
        where: { skillId: id },
        orderBy: { version: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          editedBy: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      prisma.skillVersion.count({ where: { skillId: id } }),
    ]);

    return NextResponse.json({
      data: versions,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
