// tests/unit/api/tags-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
  requireAuth: vi.fn(),
}));

import { GET, POST } from "@/app/api/v1/tags/route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

describe("GET /api/v1/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return tags ordered by name", async () => {
    const tags = [
      { id: "t1", name: "react", isSystem: true },
      { id: "t2", name: "typescript", isSystem: false },
    ];
    vi.mocked(prisma.tag.findMany).mockResolvedValue(tags as never);

    const req = new NextRequest("http://localhost/api/v1/tags");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(prisma.tag.findMany).toHaveBeenCalledWith({ orderBy: { name: "asc" } });
  });
});

describe("POST /api/v1/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/tags", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 when name is empty", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);

    const req = new NextRequest("http://localhost/api/v1/tags", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should upsert tag and return 201", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.tag.upsert).mockResolvedValue({ id: "t1", name: "react" } as never);

    const req = new NextRequest("http://localhost/api/v1/tags", {
      method: "POST",
      body: JSON.stringify({ name: "React" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.name).toBe("react");
    expect(prisma.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: "react" },
        create: { name: "react" },
      })
    );
  });
});
