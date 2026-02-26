// tests/unit/api/skill-detail-route.test.ts
// Covers GET and DELETE for /api/v1/skills/[id]
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skill: { findUnique: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { GET, DELETE } from "@/app/api/v1/skills/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";
import { auth } from "@/lib/auth";

describe("skills/[id] rate limit", () => {
  it("should return 429 for GET when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it("should return 429 for DELETE when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("GET /api/v1/skills/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(null as never);
  });

  it("should return 404 when skill not found", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/skills/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(404);
  });

  it("should return skill with reaction counts", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "my-skill",
      status: "RELEASED",
      owners: [{ userId: "u1", user: { id: "u1", name: "User" } }],
      tags: [],
      reactions: [
        { emoji: "HEART" },
        { emoji: "HEART" },
        { emoji: "ROCKET" },
      ],
      followers: [],
      followerSnapshots: [],
      _count: { comments: 2, followers: 5, changeRequests: 1 },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.reactionCounts).toEqual({ HEART: 2, ROCKET: 1 });
  });

  it("should return 403 for TEMPLATE skill when not owner/admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "viewer", role: "USER" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "TEMPLATE",
      owners: [{ userId: "owner1" }],
      tags: [], reactions: [], followers: [], followerSnapshots: [],
      _count: { comments: 0, followers: 0, changeRequests: 0 },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(403);
  });

  it("should allow owner to view TEMPLATE skill", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "owner1", role: "USER" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "TEMPLATE",
      owners: [{ userId: "owner1" }],
      tags: [], reactions: [], followers: [], followerSnapshots: [],
      _count: { comments: 0, followers: 0, changeRequests: 0 },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(200);
  });

  it("should allow admin to view TEMPLATE skill", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "TEMPLATE",
      owners: [{ userId: "owner1" }],
      tags: [], reactions: [], followers: [], followerSnapshots: [],
      _count: { comments: 0, followers: 0, changeRequests: 0 },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(200);
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/skills/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/v1/skills/[id]", () => {
  const session = { user: { id: "u1", role: "USER" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when skill not found", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/skills/s1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 403 when not owner and not admin", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", owners: [{ userId: "other" }],
    } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(403);
  });

  it("should delete skill by owner", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", owners: [{ userId: "u1" }],
    } as never);
    vi.mocked(prisma.skill.delete).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "s1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });

  it("should allow admin to delete any skill", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", owners: [{ userId: "other" }],
    } as never);
    vi.mocked(prisma.skill.delete).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(200);
  });

  it("should handle errors", async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/skills/s1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(500);
  });
});
