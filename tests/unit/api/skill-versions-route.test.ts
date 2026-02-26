// tests/unit/api/skill-versions-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skillVersion: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfter: 0 }),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { GET as listVersions } from "@/app/api/v1/skills/[id]/versions/route";
import { GET as getVersion } from "@/app/api/v1/skills/[id]/versions/[version]/route";
import { prisma } from "@/lib/prisma";
import { checkLimit } from "@/lib/api-helpers";

describe("GET /api/v1/skills/[id]/versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkLimit).mockReturnValue({
      status: 429,
      headers: new Headers({ "Retry-After": "3" }),
    } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/versions");
    const res = await listVersions(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(429);
  });

  it("should return paginated versions", async () => {
    const versions = [
      { id: "v1", skillId: "s1", version: 2, message: "updated", createdAt: new Date(), editedBy: { id: "u1", name: "User", avatarUrl: null } },
      { id: "v2", skillId: "s1", version: 1, message: null, createdAt: new Date(), editedBy: { id: "u1", name: "User", avatarUrl: null } },
    ];
    vi.mocked(prisma.skillVersion.findMany).mockResolvedValue(versions as never);
    vi.mocked(prisma.skillVersion.count).mockResolvedValue(2);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/versions");
    const res = await listVersions(req, { params: Promise.resolve({ id: "s1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
    expect(body.meta.page).toBe(1);
    expect(body.meta.totalPages).toBe(1);
  });

  it("should respect page and pageSize params", async () => {
    vi.mocked(prisma.skillVersion.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.skillVersion.count).mockResolvedValue(50);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/versions?page=3&pageSize=10");
    await listVersions(req, { params: Promise.resolve({ id: "s1" }) });

    expect(prisma.skillVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it("should order versions by version desc", async () => {
    vi.mocked(prisma.skillVersion.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.skillVersion.count).mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/versions");
    await listVersions(req, { params: Promise.resolve({ id: "s1" }) });

    expect(prisma.skillVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { version: "desc" } }),
    );
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.skillVersion.findMany).mockRejectedValue(new Error("DB error"));

    const req = new NextRequest("http://localhost/api/v1/skills/s1/versions");
    const res = await listVersions(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(500);
  });
});

describe("GET /api/v1/skills/[id]/versions/[version]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkLimit).mockReturnValue({
      status: 429,
      headers: new Headers({ "Retry-After": "3" }),
    } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/versions/1");
    const res = await getVersion(req, { params: Promise.resolve({ id: "s1", version: "1" }) });
    expect(res.status).toBe(429);
  });

  it("should return 400 for invalid version number", async () => {
    const req = new NextRequest("http://localhost/api/v1/skills/s1/versions/abc");
    const res = await getVersion(req, { params: Promise.resolve({ id: "s1", version: "abc" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid version number");
  });

  it("should return 404 when version not found", async () => {
    vi.mocked(prisma.skillVersion.findFirst).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/versions/99");
    const res = await getVersion(req, { params: Promise.resolve({ id: "s1", version: "99" }) });
    expect(res.status).toBe(404);
  });

  it("should return version detail", async () => {
    const versionRecord = {
      id: "v1",
      skillId: "s1",
      version: 1,
      spec: { name: "test-skill" },
      files: [{ path: "SKILL.md", content: "# Skill" }],
      message: "initial",
      createdAt: new Date(),
      editedBy: { id: "u1", name: "User", avatarUrl: null },
    };
    vi.mocked(prisma.skillVersion.findFirst).mockResolvedValue(versionRecord as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/versions/1");
    const res = await getVersion(req, { params: Promise.resolve({ id: "s1", version: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.version).toBe(1);
    expect(body.spec).toEqual({ name: "test-skill" });
    expect(body.files).toHaveLength(1);
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.skillVersion.findFirst).mockRejectedValue(new Error("DB error"));

    const req = new NextRequest("http://localhost/api/v1/skills/s1/versions/1");
    const res = await getVersion(req, { params: Promise.resolve({ id: "s1", version: "1" }) });
    expect(res.status).toBe(500);
  });
});
