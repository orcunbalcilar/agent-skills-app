// tests/unit/lib/matomo.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initMatomo, trackEvent, MATOMO_EVENTS } from "@/lib/matomo";

describe("initMatomo", () => {
  it("should do nothing in server context", () => {
    // window is undefined in node env for this test
    // The function should simply return without error
    const origWindow = globalThis.window;
    // @ts-expect-error -- testing server env
    delete globalThis.window;
    expect(() => initMatomo()).not.toThrow();
    globalThis.window = origWindow;
  });
});

describe("trackEvent", () => {
  let origWindow: typeof globalThis.window;

  beforeEach(() => {
    origWindow = globalThis.window;
  });

  afterEach(() => {
    globalThis.window = origWindow;
    const g = globalThis as unknown as Record<string, unknown>;
    delete g._paq;
  });

  it("should do nothing when window is undefined", () => {
    // @ts-expect-error -- testing server env
    delete globalThis.window;
    expect(() => trackEvent("cat", "act")).not.toThrow();
  });

  it("should push to _paq array when window exists", () => {
    // jsdom provides window already in vitest
    const g = globalThis as unknown as Record<string, unknown>;
    g._paq = [];
    trackEvent("skill", "downloaded", "s1", 1);

    expect(g._paq).toContainEqual(["trackEvent", "skill", "downloaded", "s1", 1]);
  });

  it("should create _paq if not present", () => {
    const g = globalThis as unknown as Record<string, unknown>;
    delete g._paq;
    trackEvent("skill", "released", "s2");

    expect(g._paq).toContainEqual(["trackEvent", "skill", "released", "s2", undefined]);
  });
});

describe("MATOMO_EVENTS", () => {
  beforeEach(() => {
    const g = globalThis as unknown as Record<string, unknown>;
    g._paq = [];
  });

  afterEach(() => {
    const g = globalThis as unknown as Record<string, unknown>;
    delete g._paq;
  });

  it("should track skill downloaded", () => {
    MATOMO_EVENTS.skillDownloaded("s1");
    const g = globalThis as unknown as Record<string, unknown>;
    expect(g._paq).toContainEqual(["trackEvent", "skill", "downloaded", "s1", undefined]);
  });

  it("should track skill released", () => {
    MATOMO_EVENTS.skillReleased("s1");
    const g = globalThis as unknown as Record<string, unknown>;
    expect(g._paq).toContainEqual(["trackEvent", "skill", "released", "s1", undefined]);
  });

  it("should track skill forked", () => {
    MATOMO_EVENTS.skillForked("s1");
    const g = globalThis as unknown as Record<string, unknown>;
    expect(g._paq).toContainEqual(["trackEvent", "skill", "forked", "s1", undefined]);
  });
});
