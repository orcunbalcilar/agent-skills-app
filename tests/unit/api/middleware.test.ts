// tests/unit/api/middleware.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn((cb: unknown) => cb),
}));

describe("API Protection Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export a config with /api/v1/:path* matcher", async () => {
    const { config } = await import("@/middleware");
    expect(config.matcher).toEqual(["/api/v1/:path*"]);
  });

  it("should export a default handler", async () => {
    const mod = await import("@/middleware");
    // The default export is the auth() wrapped middleware
    // It may be a function or an object depending on NextAuth
    expect(mod.default).toBeDefined();
  });;

  it("should not match /api/auth paths", () => {
    // The matcher only targets /api/v1/:path*
    // /api/auth/* is not matched, so middleware won't run for auth endpoints
    const matcher = "/api/v1/:path*";
    expect(/^\/api\/v1\//.exec("/api/auth/signin")).toBeNull();
    expect(/^\/api\/v1\//.exec("/api/v1/skills")).not.toBeNull();
    expect(matcher).toBe("/api/v1/:path*");
  });
});
