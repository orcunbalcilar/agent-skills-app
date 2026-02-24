// src/app/api/v1/tags/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, getIp, requireAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const limit = checkLimit(`GET /api/v1/tags ${getIp(req)}`);
  if (limit) return limit;

  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ data: tags });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limit = checkLimit(`POST /api/v1/tags ${getIp(req)}`);
  if (limit) return limit;

  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as { name?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const tag = await prisma.tag.upsert({
      where: { name: body.name.trim().toLowerCase() },
      update: {},
      create: { name: body.name.trim().toLowerCase() },
    });

    return NextResponse.json({ data: tag }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
