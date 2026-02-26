// tests/unit/api/release-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skill: { findUnique: vi.fn(), update: vi.fn() },
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

vi.mock("@/lib/sse", () => ({
  pgNotify: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/v1/skills/[id]/release/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";

describe("POST /api/v1/skills/[id]/release rate limit", () => {
  it("should return 429 when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/release", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("POST /api/v1/skills/[id]/release", () => {
  const session = { user: { id: "u1", name: "Owner", role: "USER" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/release", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when skill not found", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/release", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 400 when already released", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "RELEASED", owners: [], followers: [],
    } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/release", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(400);
  });

  it("should return 403 when not owner and not admin", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "TEMPLATE", owners: [{ userId: "other" }], followers: [],
    } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/release", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(403);
  });

  it("should release skill and notify followers", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", name: "my-skill", status: "TEMPLATE",
      owners: [{ userId: "u1" }],
      followers: [{ userId: "f1" }, { userId: "f2" }],
    } as never);
    vi.mocked(prisma.skill.update).mockResolvedValue({ id: "s1", status: "RELEASED" } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/release", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
    expect(dispatchNotification).toHaveBeenCalledWith(
      "SKILL_RELEASED", ["f1", "f2"], expect.objectContaining({ skillId: "s1" })
    );
  });

  it("should allow admin to release non-owned skill", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "admin1", role: "ADMIN", name: "Admin" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", name: "skill", status: "TEMPLATE",
      owners: [{ userId: "other" }], followers: [],
    } as never);
    vi.mocked(prisma.skill.update).mockResolvedValue({ id: "s1", status: "RELEASED" } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/release", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(200);
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/skills/s1/release", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(500);
  });

  it("should use fallback name when session user has no name", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1", name: null, role: "USER" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", name: "my-skill", status: "TEMPLATE",
      owners: [{ userId: "u1" }],
      followers: [{ userId: "f1" }],
    } as never);
    vi.mocked(prisma.skill.update).mockResolvedValue({ id: "s1", status: "RELEASED" } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/release", { method: "POST" });
    await POST(req, { params: Promise.resolve({ id: "s1" }) });

    expect(dispatchNotification).toHaveBeenCalledWith(
      "SKILL_RELEASED", ["f1"], expect.objectContaining({ actorName: "Someone" })
    );
  });
});
