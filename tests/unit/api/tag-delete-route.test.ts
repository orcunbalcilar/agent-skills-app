// tests/unit/api/tag-delete-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tag: { findUnique: vi.fn(), delete: vi.fn() },
    skillTag: { count: vi.fn() },
  },
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
  requireAuth: vi.fn(),
}));

import { DELETE } from "@/app/api/v1/tags/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";

describe("DELETE /api/v1/tags/[id] rate limit", () => {
  it("should return 429 when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/tags/t1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("DELETE /api/v1/tags/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "admin1", role: "ADMIN" },
    } as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/tags/t1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 403 when not admin", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1", role: "USER" } } as never);
    const req = new NextRequest("http://localhost/api/v1/tags/t1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(403);
  });

  it("should return 404 when tag not found", async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/tags/t1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 400 when tag is system", async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue({ id: "t1", isSystem: true } as never);
    const req = new NextRequest("http://localhost/api/v1/tags/t1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(400);
  });

  it("should return 400 when tag is in use", async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue({ id: "t1", isSystem: false } as never);
    vi.mocked(prisma.skillTag.count).mockResolvedValue(3);
    const req = new NextRequest("http://localhost/api/v1/tags/t1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(400);
  });

  it("should delete unused non-system tag", async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue({ id: "t1", isSystem: false } as never);
    vi.mocked(prisma.skillTag.count).mockResolvedValue(0);
    vi.mocked(prisma.tag.delete).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost/api/v1/tags/t1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "t1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.tag.findUnique).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/tags/t1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(500);
  });
});
