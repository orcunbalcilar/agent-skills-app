// tests/unit/api/proxy.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

let mockAuthUser: { user?: Record<string, unknown> } | null = null;

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: vi.fn((handler: (req: unknown) => unknown) => {
      // Return a function that injects auth on the request then calls handler
      return (req: Record<string, unknown>) => {
        req.auth = mockAuthUser;
        return handler(req);
      };
    }),
  })),
}));

vi.mock("../../../auth.config", () => ({
  default: { providers: [] },
}));

function makeRequest(pathname: string) {
  return {
    auth: mockAuthUser,
    nextUrl: {
      pathname,
      origin: "http://localhost:3000",
    },
  };
}

describe("Proxy (API Protection)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = null;
  });

  it("should export proxy function and proxyConfig", async () => {
    const mod = await import("../../../proxy");
    expect(mod.proxy).toBeDefined();
    expect(mod.proxyConfig).toBeDefined();
    expect(mod.proxyConfig.matcher).toBeDefined();
  });

  it("should return undefined for /_next/ paths", async () => {
    const mod = await import("../../../proxy");
    const result = await mod.proxy(makeRequest("/_next/static/chunk.js") as never);
    expect(result).toBeUndefined();
  });

  it("should return undefined for /favicon.ico", async () => {
    const mod = await import("../../../proxy");
    const result = await mod.proxy(makeRequest("/favicon.ico") as never);
    expect(result).toBeUndefined();
  });

  it("should allow auth pages freely", async () => {
    const mod = await import("../../../proxy");
    const result = await mod.proxy(makeRequest("/auth/signin") as never);
    expect(result).toBeUndefined();
  });

  it("should allow auth API freely", async () => {
    const mod = await import("../../../proxy");
    const result = await mod.proxy(makeRequest("/api/auth/session") as never);
    expect(result).toBeUndefined();
  });

  it("should return 401 for unauthenticated API requests", async () => {
    mockAuthUser = null;
    const mod = await import("../../../proxy");
    const result = await mod.proxy(makeRequest("/api/v1/skills") as never);
    expect(result).toBeDefined();
    const body = await (result as Response).json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should redirect unauthenticated page requests to signin", async () => {
    mockAuthUser = null;
    const mod = await import("../../../proxy");
    const result = await mod.proxy(makeRequest("/skills") as never);
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      expect(result.headers.get("location")).toContain("/auth/signin");
    }
  });

  it("should allow authenticated users through for pages", async () => {
    mockAuthUser = { user: { id: "u1", role: "USER" } };
    const mod = await import("../../../proxy");
    const result = await mod.proxy(makeRequest("/skills") as never);
    expect(result).toBeUndefined();
  });

  it("should allow authenticated users through for API", async () => {
    mockAuthUser = { user: { id: "u1", role: "USER" } };
    const mod = await import("../../../proxy");
    const result = await mod.proxy(makeRequest("/api/v1/skills") as never);
    expect(result).toBeUndefined();
  });

  it("should not match /api/auth paths with API protection regex", () => {
    expect(/^\/api\/v1\//.exec("/api/auth/signin")).toBeNull();
    expect(/^\/api\/v1\//.exec("/api/v1/skills")).not.toBeNull();
  });
});
