// tests/unit/api/skill-patch-versioning.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skill: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    skillVersion: { create: vi.fn() },
    skillTag: { deleteMany: vi.fn(), createMany: vi.fn() },
    tag: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfter: 0 }),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/sse", () => ({
  pgNotify: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH } from "@/app/api/v1/skills/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

describe("PATCH /api/v1/skills/[id] – versioning", () => {
  const mockSession = { user: { id: "owner1", role: "USER" }, expires: "" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockSession as never);
  });

  it("should create a version snapshot before updating", async () => {
    const existingSkill = {
      id: "s1",
      name: "my-skill",
      version: 3,
      spec: { name: "my-skill", description: "old" },
      files: [{ path: "SKILL.md", content: "old content" }],
      status: "TEMPLATE",
      owners: [{ userId: "owner1" }],
    };
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(existingSkill as never);

    // $transaction receives a callback; we need to call it to verify internal calls
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const txClient = {
        skillVersion: { create: vi.fn().mockResolvedValue({}) },
        skill: { update: vi.fn().mockResolvedValue({ ...existingSkill, version: 4, name: "updated-skill" }) },
        skillTag: { deleteMany: vi.fn(), createMany: vi.fn() },
        tag: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
      };
      const result = await (cb as (tx: typeof txClient) => Promise<unknown>)(txClient);

      // Verify that skillVersion.create was called with the old version data
      expect(txClient.skillVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          skillId: "s1",
          version: 3,
          editedById: "owner1",
        }),
      });

      // Verify skill was updated with incremented version
      expect(txClient.skill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "updated-skill",
            version: { increment: 1 },
          }),
        }),
      );

      return result;
    });

    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({
        name: "updated-skill",
        editMessage: "Fixed typo",
      }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("should reject edits on released skills", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      status: "RELEASED",
      owners: [{ userId: "owner1" }],
    } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ name: "new-name" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("released");
  });

  it("should return 403 for non-owner non-admin", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      status: "TEMPLATE",
      owners: [{ userId: "other-user" }],
    } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ name: "new-name" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(403);
  });

  it("should support tag removal via set semantics", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      version: 1,
      spec: {},
      files: null,
      status: "TEMPLATE",
      owners: [{ userId: "owner1" }],
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const txClient = {
        skillVersion: { create: vi.fn().mockResolvedValue({}) },
        skill: { update: vi.fn().mockResolvedValue({ id: "s1" }) },
        skillTag: { deleteMany: vi.fn(), createMany: vi.fn() },
        tag: { findMany: vi.fn().mockResolvedValue([{ id: "t1", name: "ai" }]), create: vi.fn() },
      };
      const result = await (cb as (tx: typeof txClient) => Promise<unknown>)(txClient);

      // Should have deleted all existing tags first (set semantics)
      expect(txClient.skillTag.deleteMany).toHaveBeenCalledWith({
        where: { skillId: "s1" },
      });

      return result;
    });

    const req = new NextRequest("http://localhost/api/v1/skills/s1", {
      method: "PATCH",
      body: JSON.stringify({ tags: ["ai"] }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
  });
});
