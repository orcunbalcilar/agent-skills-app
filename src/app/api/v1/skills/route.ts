// src/app/api/v1/skills/route.ts
export const runtime = "nodejs";

import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { searchSkills } from "@/lib/search";
import { pgNotify } from "@/lib/sse";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, retryAfter } = rateLimit(`GET /api/v1/skills ${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    });
  }

  try {
    const { searchParams } = req.nextUrl;
    const session = await auth();

    const result = await searchSkills({
      query: searchParams.get("q") ?? undefined,
      tags: searchParams.getAll("tag"),
      status: searchParams.get("status") as "TEMPLATE" | "RELEASED" | undefined,
      ownerId: searchParams.get("ownerId") ?? undefined,
      sort: (searchParams.get("sort") as Parameters<typeof searchSkills>[0]["sort"]) ?? "most_downloaded",
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 12),
      userId: session?.user?.id,
    });

    return NextResponse.json({ data: result.skills, meta: result.meta });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, retryAfter } = rateLimit(`POST /api/v1/skills ${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      name?: string;
      description?: string;
      spec?: Record<string, unknown>;
      tags?: string[];
    };

    if (!body.name || !body.description || !body.spec) {
      return NextResponse.json({ error: "name, description, and spec are required" }, { status: 400 });
    }

    const skill = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.skill.create({
        data: {
          name: body.name!,
          description: body.description!,
          spec: body.spec as Parameters<typeof prisma.skill.create>[0]["data"]["spec"],
        },
      });

      await tx.skillOwner.create({
        data: { skillId: created.id, userId: session.user.id },
      });

      if (body.tags?.length) {
        const tags = await tx.tag.findMany({ where: { name: { in: body.tags } } });
        const existing = new Set(tags.map((t) => t.name));
        const newTagNames = body.tags.filter((t) => !existing.has(t)).slice(0, 10 - tags.length);
        const createdTags = await Promise.all(
          newTagNames.map((name) => tx.tag.create({ data: { name } }))
        );
        const allTags = [...tags, ...createdTags];
        await tx.skillTag.createMany({
          data: allTags.map((t) => ({ skillId: created.id, tagId: t.id })),
        });
      }

      return created;
    });

    await pgNotify(
      "global_stats",
      JSON.stringify({ event: "skill_created", skillId: skill.id })
    );

    return NextResponse.json({ data: skill }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


