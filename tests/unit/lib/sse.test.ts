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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return stream and cleanup function", () => {
    const { stream, cleanup } = createSSEStream("ch");
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(typeof cleanup).toBe("function");
  });

  it("should send initial ping when stream starts", async () => {
    const { stream, cleanup } = createSSEStream("ch");
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    const { value } = await reader.read();
    expect(decoder.decode(value)).toBe(": ping\n\n");

    reader.releaseLock();
    await cleanup();
  });
});
