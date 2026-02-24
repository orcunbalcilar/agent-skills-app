// tests/unit/lib/search.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skill: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { searchSkills } from "@/lib/search";
import { prisma } from "@/lib/prisma";

describe("searchSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.skill.findMany).mockResolvedValue([]);
    vi.mocked(prisma.skill.count).mockResolvedValue(0);
  });

  it("should return empty results with pagination meta", async () => {
    const result = await searchSkills({});

    expect(result.skills).toEqual([]);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 12,
      total: 0,
      totalPages: 0,
    });
  });

  it("should use default sort and pagination", async () => {
    await searchSkills({});

    expect(prisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 12,
        orderBy: { downloadCount: "desc" },
      })
    );
  });

  it("should apply text query filter", async () => {
    await searchSkills({ query: "hello" });

    const call = vi.mocked(prisma.skill.findMany).mock.calls[0][0];
    const where = call?.where as Record<string, unknown>;
    expect(where).toHaveProperty("AND");
  });

  it("should filter by tags", async () => {
    await searchSkills({ tags: ["typescript", "react"] });

    const call = vi.mocked(prisma.skill.findMany).mock.calls[0][0];
    const where = call?.where as Record<string, unknown>;
    expect(where).toHaveProperty("AND");
  });

  it("should filter by status RELEASED", async () => {
    await searchSkills({ status: "RELEASED" });

    const call = vi.mocked(prisma.skill.findMany).mock.calls[0][0];
    const where = call?.where as Record<string, unknown>;
    expect(where).toHaveProperty("status", "RELEASED");
  });

  it("should paginate correctly", async () => {
    vi.mocked(prisma.skill.count).mockResolvedValue(50);

    const result = await searchSkills({ page: 3, pageSize: 10 });

    expect(prisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
    expect(result.meta.totalPages).toBe(5);
  });

  it("should sort alphabetically", async () => {
    await searchSkills({ sort: "alphabetical" });

    expect(prisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: "asc" },
      })
    );
  });

  it("should sort by newest", async () => {
    await searchSkills({ sort: "newest" });

    expect(prisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });
});
