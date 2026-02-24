// src/app/api/v1/download/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp } from "@/lib/api-helpers";
import { pgNotify } from "@/lib/sse";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`GET /api/v1/download/[id] ${getIp(req)}`);
  if (limit) return limit;

  try {
    const { id } = await params;
    const session = await (await import("@/lib/auth")).auth();

    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    await prisma.$transaction([
      prisma.skillDownloadEvent.create({
        data: { skillId: id, userId: session?.user?.id ?? null },
      }),
      prisma.skill.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
      }),
    ]);

    await pgNotify("global_stats", JSON.stringify({ event: "skill_downloaded", skillId: id }));

    return new NextResponse(JSON.stringify(skill.spec, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${skill.name}.json"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
