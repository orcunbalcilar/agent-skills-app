// tests/unit/lib/api-helpers.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { checkLimit, getIp, rateLimitResponse, requireAuth } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

describe("rateLimitResponse", () => {
  it("should return 429 with Retry-After header", () => {
    const response = rateLimitResponse(5);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("5");
  });
});

describe("checkLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when under limit", () => {
    vi.mocked(rateLimit).mockReturnValue({ allowed: true, retryAfter: 0 });
    expect(checkLimit("key")).toBeNull();
  });

  it("should return 429 response when rate limited", () => {
    vi.mocked(rateLimit).mockReturnValue({ allowed: false, retryAfter: 3 });
    const result = checkLimit("key");
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
  });
});

describe("getIp", () => {
  it("should extract IP from x-forwarded-for", () => {
    const req = new NextRequest("http://localhost", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    expect(getIp(req)).toBe("10.0.0.1");
  });

  it("should return 'unknown' when no header", () => {
    const req = new NextRequest("http://localhost");
    expect(getIp(req)).toBe("unknown");
  });
});

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const result = await requireAuth();
    expect(result).toBeNull();
  });

  it("should return null when user has no id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "a@b.com" }, expires: "" } as never);
    const result = await requireAuth();
    expect(result).toBeNull();
  });

  it("should return session when authenticated with id", async () => {
    const session = { user: { id: "u1", name: "Test" }, expires: "" };
    vi.mocked(auth).mockResolvedValue(session as never);
    const result = await requireAuth();
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe("u1");
  });
});
