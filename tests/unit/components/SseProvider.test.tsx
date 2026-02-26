// tests/unit/components/SseProvider.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, render, waitFor, act } from "@testing-library/react";
import React from "react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock EventSource
const mockEventSourceInstances: Array<{
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
}> = [];

vi.stubGlobal("EventSource", class MockEventSource {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_url: string) {
    mockEventSourceInstances.push(this);
  }
});

// Mock notification store
const mockIncrementUnreadCount = vi.fn();
const mockSetUnreadCount = vi.fn();

vi.mock("@/stores/notification-store", () => ({
  useNotificationStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      incrementUnreadCount: mockIncrementUnreadCount,
      setUnreadCount: mockSetUnreadCount,
      unreadCount: 0,
    };
    return selector(state);
  },
}));

import { SseProvider, useSse } from "@/components/shared/SseProvider";

describe("SseProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSourceInstances.length = 0;
  });
  afterEach(() => vi.restoreAllMocks());

  it("should render children", () => {
    const { getByText } = render(
      <SseProvider><div>Hello</div></SseProvider>,
    );
    expect(getByText("Hello")).toBeTruthy();
  });

  it("should establish SSE connection when userId provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ read: false }, { read: false }, { read: true }] }),
    });

    render(<SseProvider userId="u1"><div>child</div></SseProvider>);

    await waitFor(() => expect(mockEventSourceInstances).toHaveLength(1));
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/notifications?page=1&pageSize=100");
    await waitFor(() => expect(mockSetUnreadCount).toHaveBeenCalledWith(2));
  });

  it("should not establish SSE connection without userId", () => {
    render(<SseProvider><div>child</div></SseProvider>);
    expect(mockEventSourceInstances).toHaveLength(0);
  });

  it("should increment unread count on SSE message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<SseProvider userId="u1"><div>child</div></SseProvider>);

    await waitFor(() => expect(mockEventSourceInstances).toHaveLength(1));

    const es = mockEventSourceInstances[0];
    act(() => {
      es.onmessage?.(new MessageEvent("message", { data: JSON.stringify({ type: "NEW_NOTIFICATION" }) }));
    });

    expect(mockIncrementUnreadCount).toHaveBeenCalled();
  });

  it("should close EventSource on error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<SseProvider userId="u1"><div>child</div></SseProvider>);

    await waitFor(() => expect(mockEventSourceInstances).toHaveLength(1));

    const es = mockEventSourceInstances[0];
    act(() => {
      es.onerror?.();
    });

    expect(es.close).toHaveBeenCalled();
  });

  it("should clean up EventSource on unmount", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    const { unmount } = render(<SseProvider userId="u1"><div>child</div></SseProvider>);

    await waitFor(() => expect(mockEventSourceInstances).toHaveLength(1));
    unmount();
    expect(mockEventSourceInstances[0].close).toHaveBeenCalled();
  });

  it("should silently handle fetch errors for initial count", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<SseProvider userId="u1"><div>child</div></SseProvider>);

    await waitFor(() => expect(mockEventSourceInstances).toHaveLength(1));
    expect(mockSetUnreadCount).not.toHaveBeenCalled();
  });

  it("should handle non-ok fetch response for initial count", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<SseProvider userId="u1"><div>child</div></SseProvider>);

    await waitFor(() => expect(mockEventSourceInstances).toHaveLength(1));
    expect(mockSetUnreadCount).not.toHaveBeenCalled();
  });

  it("should handle fetch response with missing data field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}), // no data property
    });

    render(<SseProvider userId="u1"><div>child</div></SseProvider>);

    await waitFor(() => expect(mockEventSourceInstances).toHaveLength(1));
    expect(mockSetUnreadCount).not.toHaveBeenCalled();
  });
});

describe("useSse", () => {
  it("should return default context value", () => {
    const { result } = renderHook(() => useSse(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <SseProvider>{children}</SseProvider>
      ),
    });
    expect(result.current.notificationsUrl).toBe("/api/v1/sse/notifications");
  });
});
