// tests/unit/api/skill-patch-route.test.ts
// Additional tests for PATCH /api/v1/skills/[id]
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skill: { findUnique: vi.fn() },
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

import { PATCH } from "@/app/api/v1/skills/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";

describe("PATCH /api/v1/skills/[id] rate limit", () => {
  it("should return 429 when rate limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1", { method: "PATCH", body: JSON.stringify({ name: "test" }) });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("PATCH /api/v1/skills/[id]", () => {
  const session = { user: { id: "owner1", role: "USER", name: "Owner" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ name: "updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when skill not found", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ name: "updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 400 when skill is RELEASED", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "RELEASED", owners: [{ userId: "owner1" }],
    } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ name: "updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(400);
  });

  it("should return 403 when not owner or admin", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "other", role: "USER" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "TEMPLATE", owners: [{ userId: "owner1" }],
    } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ name: "updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(403);
  });

  it("should update skill name and spec", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "TEMPLATE", version: 1, spec: {}, files: [],
      owners: [{ userId: "owner1" }],
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        skillVersion: { create: vi.fn().mockResolvedValue({}) },
        skill: { update: vi.fn().mockResolvedValue({ id: "s1", name: "updated", version: 2 }) },
        skillTag: { deleteMany: vi.fn(), createMany: vi.fn() },
        tag: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
      });
    });

    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ name: "updated", description: "new desc" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("updated");
  });

  it("should handle tag updates with existing and new tags", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "TEMPLATE", version: 1, spec: {}, files: [],
      owners: [{ userId: "owner1" }],
    } as never);

    const mockTx = {
      skillVersion: { create: vi.fn().mockResolvedValue({}) },
      skill: { update: vi.fn().mockResolvedValue({ id: "s1", version: 2 }) },
      skillTag: { deleteMany: vi.fn(), createMany: vi.fn() },
      tag: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ id: "t1", name: "existing" }])
          .mockResolvedValueOnce([]),
        create: vi.fn().mockResolvedValue({ id: "t-new", name: "new-tag" }),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx));

    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ tags: ["t1", "new-tag"] }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
    expect(mockTx.skillTag.deleteMany).toHaveBeenCalled();
  });

  it("should allow admin to edit any skill", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "TEMPLATE", version: 1, spec: {}, files: [],
      owners: [{ userId: "owner1" }],
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        skillVersion: { create: vi.fn().mockResolvedValue({}) },
        skill: { update: vi.fn().mockResolvedValue({ id: "s1", name: "admin-edit", version: 2 }) },
        skillTag: { deleteMany: vi.fn(), createMany: vi.fn() },
        tag: { findMany: vi.fn().mockResolvedValue([]) },
      });
    });

    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ name: "admin-edit" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(200);
  });

  it("should handle errors", async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error("DB"));
    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(500);
  });

  it("should update spec and files fields", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", status: "TEMPLATE", version: 1, spec: {}, files: [],
      owners: [{ userId: "owner1" }],
    } as never);
    const mockTx = {
      skillVersion: { create: vi.fn().mockResolvedValue({}) },
      skill: { update: vi.fn().mockResolvedValue({ id: "s1", version: 2, spec: { name: "s1" }, files: [{ path: "a.txt" }] }) },
      skillTag: { deleteMany: vi.fn(), createMany: vi.fn() },
      tag: { findMany: vi.fn().mockResolvedValue([]) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx));

    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ spec: { name: "s1" }, files: [{ path: "a.txt", content: "hello" }] }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
  });
});
