// tests/unit/api/comment-edit-delete.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
  requireAuth: vi.fn(),
}));

import { PATCH, DELETE } from "@/app/api/v1/comments/[commentId]/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkLimit } from "@/lib/api-helpers";

describe("PATCH /api/v1/comments/[commentId] rate limit", () => {
  it("should return rate limit response for PATCH", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest("http://localhost/api/v1/comments/c1", { method: "PATCH", body: JSON.stringify({ content: "x" }) });
    const res = await PATCH(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it("should return rate limit response for DELETE", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest("http://localhost/api/v1/comments/c1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });
});

describe("PATCH /api/v1/comments/[commentId]", () => {
  const session = { user: { id: "u1", role: "USER" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/comments/c1", {
      method: "PATCH",
      body: JSON.stringify({ content: "updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when comment not found", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/comments/c1", {
      method: "PATCH",
      body: JSON.stringify({ content: "updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 404 when comment is deleted", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      id: "c1",
      authorId: "u1",
      deletedAt: new Date(),
    } as never);
    const req = new NextRequest("http://localhost/api/v1/comments/c1", {
      method: "PATCH",
      body: JSON.stringify({ content: "updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 403 when not the author", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      id: "c1",
      authorId: "other-user",
      deletedAt: null,
    } as never);
    const req = new NextRequest("http://localhost/api/v1/comments/c1", {
      method: "PATCH",
      body: JSON.stringify({ content: "updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("should return 400 when content is empty", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      id: "c1",
      authorId: "u1",
      deletedAt: null,
    } as never);
    const req = new NextRequest("http://localhost/api/v1/comments/c1", {
      method: "PATCH",
      body: JSON.stringify({ content: "" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(400);
  });

  it("should update comment content", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      id: "c1",
      authorId: "u1",
      deletedAt: null,
    } as never);
    vi.mocked(prisma.comment.update).mockResolvedValue({ id: "c1", content: "updated" } as never);

    const req = new NextRequest("http://localhost/api/v1/comments/c1", {
      method: "PATCH",
      body: JSON.stringify({ content: "updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ commentId: "c1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.content).toBe("updated");
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.comment.findUnique).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/comments/c1", {
      method: "PATCH",
      body: JSON.stringify({ content: "test" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/v1/comments/[commentId]", () => {
  const session = { user: { id: "u1", role: "USER" }, expires: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(session as never);
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/v1/comments/c1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when comment not found", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/comments/c1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(404);
  });

  it("should hard delete when admin", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({ id: "c1", authorId: "u2" } as never);
    vi.mocked(prisma.comment.delete).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost/api/v1/comments/c1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ commentId: "c1" }) });

    expect(res.status).toBe(200);
    expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("should soft delete when author", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({ id: "c1", authorId: "u1" } as never);
    vi.mocked(prisma.comment.update).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost/api/v1/comments/c1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ commentId: "c1" }) });

    expect(res.status).toBe(200);
    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("should return 403 when not author and not admin", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({ id: "c1", authorId: "other" } as never);

    const req = new NextRequest("http://localhost/api/v1/comments/c1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.comment.findUnique).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/comments/c1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ commentId: "c1" }) });
    expect(res.status).toBe(500);
  });
});
