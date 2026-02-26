// tests/unit/api/users-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    skill: { findMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
  requireAuth: vi.fn(),
}));

import { GET as getMe, PATCH as patchMe } from "@/app/api/v1/users/me/route";
import { GET as getUserSkills } from "@/app/api/v1/users/[id]/skills/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";

describe("Users rate limit", () => {
  it("should return 429 for getMe when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest("http://localhost/api/v1/users/me");
    const res = await getMe(req);
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it("should return 429 for patchMe when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/users/me", { method: "PATCH", body: JSON.stringify({ name: "test" }) });
    const res = await patchMe(req);
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it("should return 429 for getUserSkills when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest("http://localhost/api/v1/users/u1/skills");
    const res = await getUserSkills(req, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("GET /api/v1/users/me", () => {
  const session = { user: { id: "u1" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/users/me");
    const res = await getMe(req);
    expect(res.status).toBe(401);
  });

  it("should return user data", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1", email: "test@test.com", name: "User", role: "USER",
      _count: { ownedSkills: 5, followers: 3 },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/users/me");
    const res = await getMe(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("u1");
    expect(body.data._count.ownedSkills).toBe(5);
  });

  it("should return 404 when user not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/users/me");
    const res = await getMe(req);
    expect(res.status).toBe(404);
  });

  it("should handle errors", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/users/me");
    const res = await getMe(req);
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/v1/users/me", () => {
  const session = { user: { id: "u1" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await patchMe(req);
    expect(res.status).toBe(401);
  });

  it("should update user name", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "u1", name: "New Name", email: "test@test.com",
    } as never);

    const req = new NextRequest("http://localhost/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await patchMe(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("New Name");
  });

  it("should update user avatarUrl", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "u1", name: "User", avatarUrl: "https://example.com/avatar.png",
    } as never);

    const req = new NextRequest("http://localhost/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify({ avatarUrl: "https://example.com/avatar.png" }),
    });
    const res = await patchMe(req);
    expect(res.status).toBe(200);
  });

  it("should handle errors", async () => {
    vi.mocked(prisma.user.update).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await patchMe(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/v1/users/[id]/skills", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return paginated user skills", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [{ id: "s1", name: "skill" }],
      1,
    ] as never);

    const req = new NextRequest("http://localhost/api/v1/users/u1/skills");
    const res = await getUserSkills(req, { params: Promise.resolve({ id: "u1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
  });

  it("should support pagination params", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);

    const req = new NextRequest("http://localhost/api/v1/users/u1/skills?page=2&pageSize=5");
    const res = await getUserSkills(req, { params: Promise.resolve({ id: "u1" }) });
    const body = await res.json();

    expect(body.meta.page).toBe(2);
    expect(body.meta.pageSize).toBe(5);
  });

  it("should handle errors", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/users/u1/skills");
    const res = await getUserSkills(req, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(500);
  });
});
