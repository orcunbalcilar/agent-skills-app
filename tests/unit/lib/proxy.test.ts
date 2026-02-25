// tests/unit/lib/proxy.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NextAuth to return an auth function that we can control
const mockAuth = vi.fn().mockImplementation((handler: unknown) => handler);
vi.mock("next-auth", () => ({
  default: () => ({ auth: mockAuth }),
}));

vi.mock("../../auth.config", () => ({
  default: {
    providers: [],
    pages: { signIn: "/auth/signin" },
  },
}));

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export a proxy function", async () => {
    // The proxy module calls NextAuth(authConfig) on import
    // Our mock returns { auth: mockAuth }
    // The proxy.ts then calls auth(async function proxy(req) { ... })
    // So mockAuth is called with that function
    const proxyModule = await import("../../../proxy");
    expect(proxyModule.proxy).toBeDefined();
  });
});
