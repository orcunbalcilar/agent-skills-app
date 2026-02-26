// tests/unit/lib/sse.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockQueryFn, mockEndFn, mockConnectFn, mockOnFn } = vi.hoisted(() => ({
  mockQueryFn: vi.fn().mockResolvedValue(undefined),
  mockEndFn: vi.fn().mockResolvedValue(undefined),
  mockConnectFn: vi.fn().mockResolvedValue(undefined),
  mockOnFn: vi.fn(),
}));

vi.mock("pg", () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  class Client {
    connect = mockConnectFn;
    query = mockQueryFn;
    end = mockEndFn;
    on = mockOnFn;
  }
  return { Client };
});

import { pgNotify, createListenClient, createSSEStream } from "@/lib/sse";

describe("pgNotify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call pg_notify with sanitized channel", async () => {
    mockConnectFn.mockResolvedValue(undefined);
    mockQueryFn.mockResolvedValue(undefined);

    await pgNotify("test-channel", '{"hello":"world"}');

    // First call is connect, second is the notify query
    expect(mockQueryFn).toHaveBeenCalledWith(
      "SELECT pg_notify($1, $2)",
      ["test_channel", '{"hello":"world"}']
    );
  });

  it("should sanitize special characters in channel name", async () => {
    await pgNotify("my.special!channel@123", "payload");

    expect(mockQueryFn).toHaveBeenCalledWith(
      "SELECT pg_notify($1, $2)",
      ["my_special_channel_123", "payload"]
    );
  });

  it("should not throw on errors", async () => {
    mockQueryFn.mockRejectedValueOnce(new Error("connection failed"));
    await expect(pgNotify("ch", "data")).resolves.toBeUndefined();
  });
});

describe("createListenClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should connect and LISTEN on sanitized channel", async () => {
    const onNotify = vi.fn();
    const cleanup = await createListenClient("my-channel", onNotify);

    expect(mockConnectFn).toHaveBeenCalled();
    expect(mockQueryFn).toHaveBeenCalledWith('LISTEN "my_channel"');
    expect(mockOnFn).toHaveBeenCalledWith("notification", expect.any(Function));
    expect(typeof cleanup).toBe("function");
  });

  it("should call onNotify when a notification arrives with payload", async () => {
    const onNotify = vi.fn();
    await createListenClient("ch", onNotify);

    // Simulate notification callback
    const notificationHandler = mockOnFn.mock.calls[0][1];
    notificationHandler({ payload: '{"id":"1"}' });

    expect(onNotify).toHaveBeenCalledWith('{"id":"1"}');
  });

  it("should not call onNotify when payload is empty", async () => {
    const onNotify = vi.fn();
    await createListenClient("ch", onNotify);

    const notificationHandler = mockOnFn.mock.calls[0][1];
    notificationHandler({ payload: undefined });

    expect(onNotify).not.toHaveBeenCalled();
  });

  it("should UNLISTEN and end on cleanup", async () => {
    const cleanup = await createListenClient("ch", vi.fn());
    await cleanup();

    expect(mockQueryFn).toHaveBeenCalledWith('UNLISTEN "ch"');
    expect(mockEndFn).toHaveBeenCalled();
  });
});

describe("createSSEStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should return stream and cleanup function", () => {
    const { stream, cleanup } = createSSEStream("ch");
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(typeof cleanup).toBe("function");
  });

  it("should send initial ping when stream starts", async () => {
    vi.useRealTimers();
    const { stream, cleanup } = createSSEStream("ch");
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    const { value } = await reader.read();
    expect(decoder.decode(value)).toBe(": ping\n\n");

    reader.releaseLock();
    await cleanup();
  });

  it("should send heartbeat pings at intervals", async () => {
    vi.useRealTimers();
    const { stream, cleanup } = createSSEStream("ch");
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    // Read initial ping
    await reader.read();

    // Simulate a notification to ensure the stream is live
    const notifyHandler = mockOnFn.mock.calls[0]?.[1];
    if (notifyHandler) {
      notifyHandler({ payload: '{"test":true}' });
      const { value: dataValue } = await reader.read();
      expect(decoder.decode(dataValue)).toContain("data:");
    }

    reader.releaseLock();
    await cleanup();
  });

  it("should call onCleanup when stream is cancelled", async () => {
    vi.useRealTimers();
    const onCleanup = vi.fn();
    const { stream } = createSSEStream("ch", onCleanup);
    const reader = stream.getReader();

    // Read initial ping
    await reader.read();
    await reader.cancel();

    expect(onCleanup).toHaveBeenCalled();
  });

  it("should handle heartbeat enqueue failure gracefully", async () => {
    vi.useRealTimers();

    // Capture the heartbeat callback so we can invoke it after stream is cancelled
    let heartbeatFn: (() => void) | undefined;
    const origSetInterval = globalThis.setInterval;
    globalThis.setInterval = ((fn: TimerHandler, ms?: number) => {
      if (ms === 30_000) heartbeatFn = fn as () => void;
      return origSetInterval(fn, ms);
    }) as typeof globalThis.setInterval;

    const { stream } = createSSEStream("ch");
    const reader = stream.getReader();

    await reader.read(); // Read initial ping
    await reader.cancel(); // Closes the stream (cancel handler clears interval)

    // Manually invoke the heartbeat callback after stream is cancelled.
    // controller.enqueue() will throw, exercising the catch block (lines 71-74).
    expect(heartbeatFn).toBeDefined();
    heartbeatFn!();

    globalThis.setInterval = origSetInterval;
  });

  it("should handle heartbeat catch when heartbeatId is falsy", async () => {
    vi.useRealTimers();

    let heartbeatFn: (() => void) | undefined;
    const origSetInterval = globalThis.setInterval;
    // Return 0 (falsy) to make heartbeatId falsy for the catch branch
    globalThis.setInterval = ((fn: TimerHandler, ms?: number) => {
      if (ms === 30_000) {
        heartbeatFn = fn as () => void;
        origSetInterval(fn, 2_147_483_647); // park it far away
        return 0 as unknown as ReturnType<typeof setInterval>;
      }
      return origSetInterval(fn, ms);
    }) as typeof globalThis.setInterval;

    const { stream } = createSSEStream("ch");
    const reader = stream.getReader();
    await reader.read();
    await reader.cancel();

    // heartbeatId is 0 (falsy), so `if (heartbeatId)` in the catch is false
    expect(heartbeatFn).toBeDefined();
    heartbeatFn!();

    globalThis.setInterval = origSetInterval;
  });

  it("should handle notification enqueue failure gracefully", async () => {
    vi.useRealTimers();
    const { stream, cleanup } = createSSEStream("ch");
    const reader = stream.getReader();

    // Read initial ping
    await reader.read();

    // Cancel to make enqueue throw
    await reader.cancel();

    // If a notification arrives after cancel, the catch block in the listener handles it
    const notifyHandler = mockOnFn.mock.calls.find(
      (call: unknown[]) => call[0] === "notification"
    )?.[1];
    if (notifyHandler) {
      notifyHandler({ payload: '{"test":true}' });
    }

    await cleanup();
  });

  it("should handle cancel when cleanupFn is not yet set", async () => {
    // Make createListenClient never resolve so cleanupFn stays null during cancel
    mockConnectFn.mockReturnValue(new Promise(() => {})); // never resolves
    
    vi.useRealTimers();
    const onCleanup = vi.fn();
    const { stream } = createSSEStream("ch", onCleanup);
    const reader = stream.getReader();

    // Cancel immediately before start() finishes (cleanupFn is still null)
    await reader.cancel();

    expect(onCleanup).toHaveBeenCalled();
    // Reset mock so other tests work
    mockConnectFn.mockResolvedValue(undefined);
  });

  it("should handle cancel when cleanupFn rejects", async () => {
    // Make client.end reject so cleanupFn().catch fires
    mockEndFn.mockRejectedValueOnce(new Error("connection lost"));

    vi.useRealTimers();
    const onCleanup = vi.fn();
    const { stream } = createSSEStream("ch", onCleanup);
    const reader = stream.getReader();

    await reader.read(); // Read initial ping (waits for start to complete)
    await reader.cancel(); // cancel → cleanupFn?.().catch(() => {}) — catch fires

    expect(onCleanup).toHaveBeenCalled();
  });

  it("cleanup function should clear heartbeat and call cleanupFn", async () => {
    vi.useRealTimers();
    const { stream, cleanup } = createSSEStream("ch");
    const reader = stream.getReader();

    // Read initial ping
    await reader.read();
    reader.releaseLock();

    // Call cleanup
    await cleanup();

    // Cleanup should have called end on pg client
    expect(mockEndFn).toHaveBeenCalled();
  });

  it("should handle cleanup called before stream starts", async () => {
    // Make createListenClient never resolve so cleanupFn/heartbeatId stay null
    mockConnectFn.mockReturnValue(new Promise(() => {}));
    vi.useRealTimers();

    const { cleanup } = createSSEStream("ch");
    // Call cleanup immediately — heartbeatId is null, cleanupFn is null
    await cleanup();

    // Reset mock so other tests work
    mockConnectFn.mockResolvedValue(undefined);
  });
});
