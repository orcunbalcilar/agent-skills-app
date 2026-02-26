// tests/unit/api/skills-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skill: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    skillOwner: { create: vi.fn() },
    tag: { findMany: vi.fn() },
    skillTag: { createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfter: 0 }),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/search", () => ({
  searchSkills: vi.fn(),
}));

vi.mock("@/lib/sse", () => ({
  pgNotify: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from "@/app/api/v1/skills/route";
import { rateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { searchSkills } from "@/lib/search";
import { prisma } from "@/lib/prisma";

describe("GET /api/v1/skills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockReturnValue({ allowed: true, retryAfter: 0 });
    vi.mocked(auth).mockResolvedValue(null as never);
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(rateLimit).mockReturnValue({ allowed: false, retryAfter: 5 });

    const req = new NextRequest("http://localhost/api/v1/skills");
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("should return skills with pagination", async () => {
    vi.mocked(searchSkills).mockResolvedValue({
      skills: [{ id: "s1", name: "test" }] as never,
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    });

    const req = new NextRequest("http://localhost/api/v1/skills");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
  });

  it("should pass search params to searchSkills", async () => {
    vi.mocked(searchSkills).mockResolvedValue({
      skills: [] as never,
      meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
    });

    const req = new NextRequest("http://localhost/api/v1/skills?q=hello&sort=newest&page=2");
    await GET(req);

    expect(searchSkills).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "hello",
        sort: "newest",
        page: 2,
      })
    );
  });
});

describe("POST /api/v1/skills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockReturnValue({ allowed: true, retryAfter: 0 });
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = new NextRequest("http://localhost/api/v1/skills", {
      method: "POST",
      body: JSON.stringify({ name: "test", description: "desc", spec: {} }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 when missing required fields", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" }, expires: "" } as never);

    const req = new NextRequest("http://localhost/api/v1/skills", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should create skill and return 201", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" }, expires: "" } as never);
    const mockSkill = { id: "s1", name: "test", description: "desc" };
    vi.mocked(prisma.$transaction).mockResolvedValue(mockSkill as never);

    const req = new NextRequest("http://localhost/api/v1/skills", {
      method: "POST",
      body: JSON.stringify({
        name: "test",
        description: "A valid description",
        spec: { name: "test", description: "A valid description" },
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe("s1");
  });

  it("should return 422 when spec has invalid name", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" }, expires: "" } as never);

    const req = new NextRequest("http://localhost/api/v1/skills", {
      method: "POST",
      body: JSON.stringify({
        name: "Invalid-Name",
        description: "desc",
        spec: { name: "Invalid-Name" },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain("Invalid skill spec");
  });

  it("should return 400 when description is empty", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" }, expires: "" } as never);

    const req = new NextRequest("http://localhost/api/v1/skills", {
      method: "POST",
      body: JSON.stringify({
        name: "my-skill",
        description: "",
        spec: {},
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should create skill with tags (existing and new)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" }, expires: "" } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
      if (typeof cb === "function") {
        return cb({
          skill: { create: vi.fn().mockResolvedValue({ id: "s1", name: "test" }) },
          skillOwner: { create: vi.fn().mockResolvedValue({}) },
          tag: {
            findMany: vi.fn().mockResolvedValue([{ id: "t1", name: "existing" }]),
            create: vi.fn().mockResolvedValue({ id: "t-new", name: "new-tag" }),
          },
          skillTag: { createMany: vi.fn().mockResolvedValue({}) },
        } as never);
      }
      return [];
    });

    const req = new NextRequest("http://localhost/api/v1/skills", {
      method: "POST",
      body: JSON.stringify({
        name: "test",
        description: "A valid description",
        spec: { name: "test", description: "A valid description" },
        tags: ["existing", "new-tag"],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("should create skill without tags", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" }, expires: "" } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
      if (typeof cb === "function") {
        return cb({
          skill: { create: vi.fn().mockResolvedValue({ id: "s2", name: "no-tags" }) },
          skillOwner: { create: vi.fn().mockResolvedValue({}) },
        } as never);
      }
      return [];
    });

    const req = new NextRequest("http://localhost/api/v1/skills", {
      method: "POST",
      body: JSON.stringify({
        name: "no-tags",
        description: "A valid description",
        spec: { name: "no-tags", description: "A valid description" },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("should create skill with files", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" }, expires: "" } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
      if (typeof cb === "function") {
        return cb({
          skill: { create: vi.fn().mockResolvedValue({ id: "s3", name: "with-files" }) },
          skillOwner: { create: vi.fn().mockResolvedValue({}) },
        } as never);
      }
      return [];
    });

    const req = new NextRequest("http://localhost/api/v1/skills", {
      method: "POST",
      body: JSON.stringify({
        name: "with-files",
        description: "A valid description",
        spec: { name: "with-files", description: "A valid description" },
        files: [{ path: "SKILL.md", content: "test" }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("should handle POST errors gracefully", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" }, expires: "" } as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB error"));

    const req = new NextRequest("http://localhost/api/v1/skills", {
      method: "POST",
      body: JSON.stringify({
        name: "test",
        description: "A valid description",
        spec: { name: "test", description: "A valid description" },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should return POST 429 when rate limited", async () => {
    vi.mocked(rateLimit).mockReturnValue({ allowed: false, retryAfter: 3 });
    const req = new NextRequest("http://localhost/api/v1/skills", {
      method: "POST",
      body: JSON.stringify({ name: "test", description: "desc", spec: {} }),
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("should handle GET errors gracefully", async () => {
    vi.mocked(searchSkills).mockRejectedValue(new Error("Search failed"));
    const req = new NextRequest("http://localhost/api/v1/skills");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
