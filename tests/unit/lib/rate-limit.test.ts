// tests/unit/lib/rate-limit.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    // Reset the internal store by advancing time past the window
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow the first request", () => {
    const result = rateLimit("test-ip-1");
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBe(0);
  });

  it("should allow up to 20 requests within the window", () => {
    const ip = "test-ip-2";
    for (let i = 0; i < 20; i++) {
      const result = rateLimit(ip);
      expect(result.allowed).toBe(true);
    }
  });

  it("should block the 21st request within the window", () => {
    const ip = "test-ip-3";
    for (let i = 0; i < 20; i++) {
      rateLimit(ip);
    }
    const result = rateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should reset after the window expires", () => {
    const ip = "test-ip-4";
    for (let i = 0; i < 20; i++) {
      rateLimit(ip);
    }
    // Advance past the 1-second window
    vi.advanceTimersByTime(1100);
    const result = rateLimit(ip);
    expect(result.allowed).toBe(true);
  });

  it("should track different IPs independently", () => {
    const ip1 = "ip-a";
    const ip2 = "ip-b";
    for (let i = 0; i < 20; i++) {
      rateLimit(ip1);
    }
    expect(rateLimit(ip1).allowed).toBe(false);
    expect(rateLimit(ip2).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("should extract IP from x-forwarded-for header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("should return 'unknown' when no header is present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});
