// tests/unit/api/comments-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    skill: { findUnique: vi.fn() },
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

import { GET, POST } from "@/app/api/v1/skills/[id]/comments/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";
import { dispatchNotification } from "@/lib/notifications";

describe("GET /api/v1/skills/[id]/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 }) as never
    );
    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(429);
  });

  it("should return paginated comments", async () => {
    const comments = [
      { id: "c1", content: "Great!", deletedAt: null, reactions: [], author: { id: "u1", name: "User", avatarUrl: null } },
    ];
    vi.mocked(prisma.$transaction).mockResolvedValue([comments, 1] as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].content).toBe("Great!");
    expect(body.meta.total).toBe(1);
  });

  it("should mask deleted comment content", async () => {
    const comments = [
      { id: "c1", content: "Hidden", deletedAt: new Date().toISOString(), reactions: [], author: { id: "u1", name: "User", avatarUrl: null } },
    ];
    vi.mocked(prisma.$transaction).mockResolvedValue([comments, 1] as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments?page=1&pageSize=5");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    const body = await res.json();

    expect(body.data[0].content).toBe("[deleted]");
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB error"));

    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(500);
  });
});

describe("POST /api/v1/skills/[id]/comments", () => {
  const session = { user: { id: "u1", name: "User" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 }) as never
    );
    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "test" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(429);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "test" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when skill not found", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "test" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 400 when content is empty", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({ id: "s1", name: "test", followers: [] } as never);
    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "  " }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(400);
  });

  it("should create comment and dispatch notification", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "test-skill",
      followers: [{ userId: "u2" }],
    } as never);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      id: "c1",
      content: "Nice!",
      author: { id: "u1", name: "User" },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "Nice!" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(201);
    expect(dispatchNotification).toHaveBeenCalledWith(
      "NEW_COMMENT",
      ["u2"],
      expect.objectContaining({ skillId: "s1", commentId: "c1" })
    );
  });

  it("should not notify the comment author", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "test",
      followers: [{ userId: "u1" }],
    } as never);
    vi.mocked(prisma.comment.create).mockResolvedValue({ id: "c1", content: "test" } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "hello" }),
    });
    await POST(req, { params: Promise.resolve({ id: "s1" }) });

    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("should skip notification when no followers", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "test",
      followers: [],
    } as never);
    vi.mocked(prisma.comment.create).mockResolvedValue({ id: "c1", content: "test" } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "hello" }),
    });
    await POST(req, { params: Promise.resolve({ id: "s1" }) });

    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("should use fallback name when session user has no name", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1", name: null } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "test-skill",
      followers: [{ userId: "u2" }],
    } as never);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      id: "c1",
      content: "test",
      author: { id: "u1", name: null },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "hello" }),
    });
    await POST(req, { params: Promise.resolve({ id: "s1" }) });

    expect(dispatchNotification).toHaveBeenCalledWith(
      "NEW_COMMENT",
      ["u2"],
      expect.objectContaining({ actorName: "Someone" })
    );
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/skills/s1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "test" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(500);
  });
});
