// tests/unit/api/request-approve.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    changeRequest: { findUnique: vi.fn() },
    $transaction: vi.fn(),
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

import { POST } from "@/app/api/v1/requests/[requestId]/approve/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";

describe("POST /api/v1/requests/[requestId]/approve rate limit", () => {
  it("should return 429 when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/requests/r1/approve", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("POST /api/v1/requests/[requestId]/approve", () => {
  const session = { user: { id: "owner1", name: "Owner", role: "USER" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/requests/r1/approve", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when request not found", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        changeRequest: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
        skill: { update: vi.fn() },
        $executeRaw: vi.fn(),
      });
    });

    const req = new NextRequest("http://localhost/api/v1/requests/r1/approve", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 400 when request is not OPEN", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        changeRequest: {
          findUnique: vi.fn().mockResolvedValue({
            id: "r1", status: "APPROVED", requesterId: "u1",
            skill: { id: "s1", name: "test", owners: [{ userId: "owner1" }] },
          }),
          update: vi.fn(),
        },
        skill: { update: vi.fn() },
        $executeRaw: vi.fn(),
      });
    });

    const req = new NextRequest("http://localhost/api/v1/requests/r1/approve", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(400);
  });

  it("should return 403 when not owner or admin", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "other", role: "USER" } } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        changeRequest: {
          findUnique: vi.fn().mockResolvedValue({
            id: "r1", status: "OPEN", requesterId: "u1",
            skill: { id: "s1", name: "test", owners: [{ userId: "owner1" }] },
          }),
          update: vi.fn(),
        },
        skill: { update: vi.fn() },
        $executeRaw: vi.fn(),
      });
    });

    const req = new NextRequest("http://localhost/api/v1/requests/r1/approve", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(403);
  });

  it("should approve request and notify requester", async () => {
    const updatedCr = { id: "r1", status: "APPROVED", requesterId: "u1" };
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        changeRequest: {
          findUnique: vi.fn().mockResolvedValue({
            id: "r1", status: "OPEN", skillId: "s1", requesterId: "u1",
            skill: { id: "s1", name: "test-skill", owners: [{ userId: "owner1" }] },
          }),
          update: vi.fn().mockResolvedValue(updatedCr),
        },
        skill: { update: vi.fn() },
        $executeRaw: vi.fn(),
      });
    });
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1", requesterId: "u1", skillId: "s1",
    } as never);

    const req = new NextRequest("http://localhost/api/v1/requests/r1/approve", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("APPROVED");
    expect(dispatchNotification).toHaveBeenCalledWith(
      "CHANGE_REQUEST_APPROVED",
      ["u1"],
      expect.objectContaining({ requestId: "r1" }),
    );
  });

  it("should skip notification when findUnique returns null after approval", async () => {
    const updatedCr = { id: "r1", status: "APPROVED", requesterId: "u1" };
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        changeRequest: {
          findUnique: vi.fn().mockResolvedValue({
            id: "r1", status: "OPEN", skillId: "s1", requesterId: "u1",
            skill: { id: "s1", name: "test-skill", owners: [{ userId: "owner1" }] },
          }),
          update: vi.fn().mockResolvedValue(updatedCr),
        },
        skill: { update: vi.fn() },
        $executeRaw: vi.fn(),
      });
    });
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/requests/r1/approve", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });

    expect(res.status).toBe(200);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("should use fallback name when session user has no name", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "owner1", name: null, role: "USER" } } as never);
    const updatedCr = { id: "r1", status: "APPROVED", requesterId: "u1" };
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        changeRequest: {
          findUnique: vi.fn().mockResolvedValue({
            id: "r1", status: "OPEN", skillId: "s1", requesterId: "u1",
            skill: { id: "s1", name: "test-skill", owners: [{ userId: "owner1" }] },
          }),
          update: vi.fn().mockResolvedValue(updatedCr),
        },
        skill: { update: vi.fn() },
        $executeRaw: vi.fn(),
      });
    });
    vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({
      id: "r1", requesterId: "u1", skillId: "s1",
    } as never);

    const req = new NextRequest("http://localhost/api/v1/requests/r1/approve", { method: "POST" });
    await POST(req, { params: Promise.resolve({ requestId: "r1" }) });

    expect(dispatchNotification).toHaveBeenCalledWith(
      "CHANGE_REQUEST_APPROVED",
      ["u1"],
      expect.objectContaining({ actorName: "Someone" }),
    );
  });

  it("should handle errors", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB"));
    const req = new NextRequest("http://localhost/api/v1/requests/r1/approve", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ requestId: "r1" }) });
    expect(res.status).toBe(500);
  });
});
