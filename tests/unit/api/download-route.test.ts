// tests/unit/api/download-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skill: { findUnique: vi.fn(), update: vi.fn() },
    skillDownloadEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/api-helpers", () => ({
  checkLimit: vi.fn().mockReturnValue(null),
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }),
}));

vi.mock("@/lib/sse", () => ({
  pgNotify: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", async () => {
  // Re-import to override the previous mock correctly
  return {
    prisma: {
      skill: { findUnique: vi.fn(), update: vi.fn() },
      skillDownloadEvent: { create: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("jszip", () => {
  const mockFolder = {
    file: vi.fn(),
  };
  return {
    default: class JSZipMock {
      folder = vi.fn().mockReturnValue(mockFolder);
      generateAsync = vi.fn().mockResolvedValue(Buffer.from("ZIP"));
    },
  };
});

vi.mock("js-yaml", () => ({
  default: { dump: vi.fn().mockReturnValue("name: test-skill\n") },
}));

import { GET } from "@/app/api/v1/download/[id]/route";
import { prisma } from "@/lib/prisma";
import { checkLimit } from "@/lib/api-helpers";

describe("GET /api/v1/download/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return rate limit response when limited", async () => {
    const limitResponse = new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
    vi.mocked(checkLimit).mockReturnValue(limitResponse as never);
    const req = new NextRequest("http://localhost/api/v1/download/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(429);
    vi.mocked(checkLimit).mockReturnValue(null);
  });

  it("should return 404 when skill not found", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/download/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(404);
  });

  it("should download skill as zip", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "test-skill",
      spec: { name: "test-skill", description: "A test skill" },
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    const req = new NextRequest("http://localhost/api/v1/download/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("Content-Disposition")).toContain("test-skill.zip");
  });

  it("should download skill with body in spec", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "test-skill",
      spec: { name: "test-skill", description: "A test skill", body: "# Instructions\nDo this." },
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    const req = new NextRequest("http://localhost/api/v1/download/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
  });

  it("should download when no session (anonymous)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "test-skill",
      spec: { name: "test-skill", description: "A test skill" },
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    const req = new NextRequest("http://localhost/api/v1/download/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.skill.findUnique).mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/v1/download/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(500);
  });

  it("should return 403 for template skill when user is not owner", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u2" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "test-skill",
      status: "TEMPLATE",
      spec: { name: "test-skill", description: "A test skill" },
      owners: [{ userId: "u1" }],
    } as never);

    const req = new NextRequest("http://localhost/api/v1/download/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(403);
  });

  it("should allow template download for owner", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "test-skill",
      status: "TEMPLATE",
      spec: { name: "test-skill", description: "A test skill" },
      owners: [{ userId: "u1" }],
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    const req = new NextRequest("http://localhost/api/v1/download/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(200);
  });

  it("should allow template download for admin", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u3", role: "ADMIN" } } as never);
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1",
      name: "test-skill",
      status: "TEMPLATE",
      spec: { name: "test-skill", description: "A test skill" },
      owners: [{ userId: "u1" }],
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    const req = new NextRequest("http://localhost/api/v1/download/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(200);
  });
});
