// src/app/api/v1/users/[id]/skills/route.ts

import { checkLimit, getIp } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`GET /api/v1/users/[id]/skills ${getIp(req)}`);
  if (limit) return limit;

  try {
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 12);

    const [skills, total] = await prisma.$transaction([
      prisma.skill.findMany({
        where: {
          owners: { some: { userId: id } },
          status: "RELEASED",
        },
        include: {
          tags: { include: { tag: true } },
          _count: { select: { followers: true } },
        },
        orderBy: { releasedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.skill.count({
        where: {
          owners: { some: { userId: id } },
          status: "RELEASED",
        },
      }),
    ]);

    return NextResponse.json({
      data: skills,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
