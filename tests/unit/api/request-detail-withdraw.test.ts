// tests/unit/api/request-detail-withdraw.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    changeRequest: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
  requireAuth: vi.fn(),
}));

import { GET, DELETE } from "@/app/api/v1/requests/[requestId]/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";

describe("GET /api/v1/requests/[requestId] rate limit", () => {
  it("should return 429 when rate limited on GET", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest("http://localhost/api/v1/requests/r1");
    const res = await GET(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it("should return 429 when rate limited on DELETE", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/requests/r1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("GET /api/v1/requests/[requestId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 404 when not found", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/requests/r1");
    const res = await GET(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(404);
  });

  it("should return request with relations", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1",
      status: "OPEN",
      requester: { id: "u1", name: "User", avatarUrl: null },
      resolvedBy: null,
      skill: { id: "s1", name: "skill" },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/requests/r1");
    const res = await GET(req, { params: Promise.resolve({ requestId: "r1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("r1");
    expect(body.data.skill.name).toBe("skill");
  });

  it("should handle errors", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockRejectedValue(new Error("DB"));
    const req = new NextRequest("http://localhost/api/v1/requests/r1");
    const res = await GET(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/v1/requests/[requestId] (withdraw)", () => {
  const session = { user: { id: "u1", role: "USER", name: "User" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/requests/r1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when not found", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/requests/r1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 403 when not requester or admin", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1", requesterId: "other", status: "OPEN",
    } as never);
    const req = new NextRequest("http://localhost/api/v1/requests/r1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(403);
  });

  it("should return 400 when request is not OPEN", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1", requesterId: "u1", status: "APPROVED",
    } as never);
    const req = new NextRequest("http://localhost/api/v1/requests/r1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(400);
  });

  it("should withdraw OPEN request by requester", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1", requesterId: "u1", status: "OPEN",
    } as never);
    vi.mocked(prisma.changeRequest.update).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost/api/v1/requests/r1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ requestId: "r1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.withdrawn).toBe(true);
    expect(prisma.changeRequest.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { status: "WITHDRAWN" },
    });
  });

  it("should allow admin to withdraw any request", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } } as never);
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1", requesterId: "other", status: "OPEN",
    } as never);
    vi.mocked(prisma.changeRequest.update).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost/api/v1/requests/r1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(200);
  });

  it("should handle errors", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockRejectedValue(new Error("DB"));
    const req = new NextRequest("http://localhost/api/v1/requests/r1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(500);
  });
});
