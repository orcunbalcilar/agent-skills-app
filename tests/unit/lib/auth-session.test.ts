// tests/unit/lib/auth-session.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => {
  // Capture the callbacks so we can test them
  return {
    default: vi.fn((config) => {
      // Store callbacks for testing
      (globalThis as Record<string, unknown>).__authCallbacks = config.callbacks;
      return {
        handlers: {},
        auth: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
      };
    }),
  };
});

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(),
}));

vi.mock("../../auth.config", () => ({
  default: {
    pages: { signIn: "/auth/signin" },
    providers: [],
  },
}));

describe("Auth session callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Force re-import to capture callbacks
    vi.resetModules();
  });

  it("should set session.user.image from avatarUrl", async () => {
    // Re-import to trigger NextAuth() call
    vi.resetModules();

    // Re-mock dependencies for fresh import
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "u1",
            role: "USER",
            githubId: "gh123",
            avatarUrl: "https://example.com/avatar.jpg",
          }),
          create: vi.fn(),
        },
      },
    }));

    vi.doMock("next-auth", () => ({
      default: vi.fn((config) => {
        (globalThis as Record<string, unknown>).__testCallbacks = config.callbacks;
        return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
      }),
    }));

    vi.doMock("@auth/prisma-adapter", () => ({
      PrismaAdapter: vi.fn(),
    }));

    vi.doMock("../../auth.config", () => ({
      default: { pages: {}, providers: [] },
    }));

    await import("@/lib/auth");

    const callbacks = (globalThis as Record<string, unknown>).__testCallbacks as {
      session: (args: { session: Record<string, Record<string, unknown>>; token: { sub?: string } }) => Promise<unknown>;
    };

    expect(callbacks.session).toBeDefined();

    const session = { user: { id: "", role: "", image: undefined as string | undefined } };
    const token = { sub: "u1" };

    const result = await callbacks.session({ session, token });
    const resultSession = result as typeof session;

    expect(resultSession.user.image).toBe("https://example.com/avatar.jpg");
    expect(resultSession.user.id).toBe("u1");
  });
});
