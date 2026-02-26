// tests/unit/api/owners-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skill: { findUnique: vi.fn() },
    skillOwner: { upsert: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/v1/skills/[id]/owners/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";

describe("POST /api/v1/skills/[id]/owners rate limit", () => {
  it("should return 429 when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/owners", { method: "POST", body: JSON.stringify({ userId: "u2" }) });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("POST /api/v1/skills/[id]/owners", () => {
  const session = { user: { id: "u1", name: "Owner", role: "USER" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/owners", {
      method: "POST",
      body: JSON.stringify({ userId: "u2" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when skill not found", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/owners", {
      method: "POST",
      body: JSON.stringify({ userId: "u2" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 403 when not owner and not admin", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", owners: [{ userId: "other" }],
    } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/owners", {
      method: "POST",
      body: JSON.stringify({ userId: "u2" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(403);
  });

  it("should return 400 when userId is missing", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", owners: [{ userId: "u1" }],
    } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/owners", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(400);
  });

  it("should return 404 when target user not found", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", owners: [{ userId: "u1" }],
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/owners", {
      method: "POST",
      body: JSON.stringify({ userId: "nonexistent" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(404);
  });

  it("should use fallback name when session user has no name", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1", name: null, role: "USER" }, expires: "" } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", name: "test-skill", owners: [{ userId: "u1" }],
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u2" } as never);
    vi.mocked(prisma.skillOwner.upsert).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/owners", {
      method: "POST",
      body: JSON.stringify({ userId: "u2" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(201);
    expect(dispatchNotification).toHaveBeenCalledWith(
      "OWNER_ADDED", ["u2"], expect.objectContaining({ actorName: "Someone" })
    );
  });

  it("should add owner and dispatch notification", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", name: "my-skill", owners: [{ userId: "u1" }],
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u2" } as never);
    vi.mocked(prisma.skillOwner.upsert).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/owners", {
      method: "POST",
      body: JSON.stringify({ userId: "u2" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(201);
    expect(dispatchNotification).toHaveBeenCalledWith(
      "OWNER_ADDED", ["u2"], expect.objectContaining({ skillId: "s1" })
    );
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/skills/s1/owners", {
      method: "POST",
      body: JSON.stringify({ userId: "u2" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(500);
  });
});
