// lib/search.ts
import { prisma } from "@/lib/prisma";

export type SortOption =
  | "most_downloaded"
  | "newest"
  | "most_followed"
  | "recently_updated"
  | "alphabetical";

export interface SearchParams {
  query?: string;
  tags?: string[];
  status?: "TEMPLATE" | "RELEASED";
  ownerId?: string;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
  userId?: string;
}

type WhereInput = Parameters<typeof prisma.skill.findMany>[0]["where"];
type OrderInput = Parameters<typeof prisma.skill.findMany>[0]["orderBy"];

function buildWhere(params: SearchParams): WhereInput {
  const { query, tags, status, ownerId, userId } = params;
  const conditions: WhereInput[] = [];

  if (status === "TEMPLATE") {
    const templateCond: WhereInput = { status: "TEMPLATE" };
    if (userId) {
      (templateCond as Record<string, unknown>).owners = { some: { userId } };
    }
    conditions.push(templateCond);
  } else if (status === "RELEASED") {
    conditions.push({ status: "RELEASED" });
  } else if (userId) {
    conditions.push({
      OR: [
        { status: "RELEASED" },
        { status: "TEMPLATE", owners: { some: { userId } } },
      ],
    });
  } else {
    conditions.push({ status: "RELEASED" });
  }

  if (ownerId) {
    conditions.push({ owners: { some: { userId: ownerId } } });
  }

  if (tags && tags.length > 0) {
    conditions.push({ tags: { some: { tag: { name: { in: tags } } } } });
  }

  if (query?.trim()) {
    const q = query.trim();
    conditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    });
  }

  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

function getSortOrder(sort: SortOption): OrderInput {
  const orderMap: Record<SortOption, OrderInput> = {
    most_downloaded: { downloadCount: "desc" },
    newest: { createdAt: "desc" },
    most_followed: { followers: { _count: "desc" } },
    recently_updated: { updatedAt: "desc" },
    alphabetical: { name: "asc" },
  };
  return orderMap[sort];
}

export async function searchSkills(params: SearchParams) {
  const { sort = "most_downloaded", page = 1, pageSize = 12 } = params;
  const skip = (page - 1) * pageSize;
  const where = buildWhere(params);
  const orderBy = getSortOrder(sort);

  const [skills, total] = await Promise.all([
    prisma.skill.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        owners: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        tags: { include: { tag: true } },
        reactions: true,
        _count: { select: { followers: true, comments: true } },
      },
    }),
    prisma.skill.count({ where }),
  ]);

  return {
    skills,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

