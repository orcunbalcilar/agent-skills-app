// tests/unit/api/notifications-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
  requireAuth: vi.fn(),
}));

import { GET } from "@/app/api/v1/notifications/route";
import { requireAuth, checkLimit } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

describe("GET /api/v1/notifications rate limit", () => {
  it("should return rate limit response", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest("http://localhost/api/v1/notifications");
    const res = await GET(req);
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("GET /api/v1/notifications error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkLimit).mockReturnValue(null);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/notifications");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/v1/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/notifications");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return notifications with pagination", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "u1" },
    } as never);

    const { prisma } = await import("@/lib/prisma");
    const notifications = [
      { id: "n1", userId: "u1", type: "NEW_COMMENT", read: false },
    ];
    vi.mocked(prisma.$transaction).mockResolvedValue([notifications, 1] as never);

    const req = new NextRequest("http://localhost/api/v1/notifications");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
  });

  it("should support pagination params", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "u1" },
    } as never);

    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);

    const req = new NextRequest("http://localhost/api/v1/notifications?page=2&pageSize=5");
    const res = await GET(req);
    const body = await res.json();

    expect(body.meta.page).toBe(2);
    expect(body.meta.pageSize).toBe(5);
  });
});
