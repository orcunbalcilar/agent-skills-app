// tests/unit/api/request-reject.test.ts
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

vi.mock("@/lib/notifications", () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/v1/requests/[requestId]/reject/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";

describe("POST /api/v1/requests/[requestId]/reject rate limit", () => {
  it("should return 429 when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/requests/r1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("POST /api/v1/requests/[requestId]/reject", () => {
  const session = { user: { id: "owner1", name: "Owner", role: "USER" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/requests/r1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when not found", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/requests/r1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 400 when not OPEN", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1", status: "APPROVED", requesterId: "u1",
      skill: { id: "s1", name: "test", owners: [{ userId: "owner1" }] },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/requests/r1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(400);
  });

  it("should return 403 when not owner or admin", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "other", role: "USER" } } as never);
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1", status: "OPEN", requesterId: "u1",
      skill: { id: "s1", name: "test", owners: [{ userId: "owner1" }] },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/requests/r1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(403);
  });

  it("should reject request and notify requester", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1", status: "OPEN", requesterId: "u1", skillId: "s1",
      skill: { id: "s1", name: "test-skill", owners: [{ userId: "owner1" }] },
    } as never);
    vi.mocked(prisma.changeRequest.update).mockResolvedValue({
      id: "r1", status: "REJECTED",
    } as never);

    const req = new NextRequest("http://localhost/api/v1/requests/r1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("REJECTED");
    expect(dispatchNotification).toHaveBeenCalledWith(
      "CHANGE_REQUEST_REJECTED",
      ["u1"],
      expect.objectContaining({
        skillId: "s1",
        skillName: "test-skill",
        actorName: "Owner",
        requestId: "r1",
      }),
    );
  });

  it("should handle errors", async () => {
    vi.mocked(prisma.changeRequest.findUnique).mockRejectedValue(new Error("DB"));
    const req = new NextRequest("http://localhost/api/v1/requests/r1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(500);
  });

  it("should use fallback name when session user has no name", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "owner1", name: null, role: "USER" } } as never);
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1", status: "OPEN", requesterId: "u1", skillId: "s1",
      skill: { id: "s1", name: "test-skill", owners: [{ userId: "owner1" }] },
    } as never);
    vi.mocked(prisma.changeRequest.update).mockResolvedValue({
      id: "r1", status: "REJECTED",
    } as never);

    const req = new NextRequest("http://localhost/api/v1/requests/r1/reject", { method: "POST" });
    await POST(req, { params: Promise.resolve({ requestId: "r1" }) });

    expect(dispatchNotification).toHaveBeenCalledWith(
      "CHANGE_REQUEST_REJECTED",
      ["u1"],
      expect.objectContaining({ actorName: "Someone" }),
    );
  });
});
