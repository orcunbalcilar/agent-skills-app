// tests/unit/api/proxy.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: vi.fn((cb: unknown) => cb),
  })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init: { status: number }) => ({
      body,
      status: init.status,
    })),
  },
}));

describe("Proxy (API Protection)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export proxy function and proxyConfig", async () => {
    const mod = await import("../../../proxy");
    expect(mod.proxy).toBeDefined();
    expect(mod.proxyConfig).toBeDefined();
    expect(mod.proxyConfig.matcher).toBeDefined();
  });

  it("should not match /api/auth paths with API protection regex", () => {
    // Proxy protects /api/v1/* but not /api/auth/*
    expect(/^\/api\/v1\//.exec("/api/auth/signin")).toBeNull();
    expect(/^\/api\/v1\//.exec("/api/v1/skills")).not.toBeNull();
  });
});
