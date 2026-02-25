// tests/unit/lib/sse-provider-initial-fetch.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

// Mock EventSource as a proper class on globalThis
const MockES = vi.hoisted(() => {
  return class EventSourceMock {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    close() { /* noop */ }
  };
});

globalThis.EventSource = MockES as unknown as typeof EventSource;

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

// We need access to the store to verify state
import { useNotificationStore } from "@/stores/notification-store";
import { SseProvider } from "@/components/shared/SseProvider";

function createWrapper(userId?: string) {
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <SseProvider userId={userId}>{children}</SseProvider>;
  };
}

describe("SseProvider – initial unread count fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({ unreadCount: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch initial unread count on mount when userId is provided", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            { id: "n1", read: false },
            { id: "n2", read: true },
            { id: "n3", read: false },
          ],
        }),
    });

    renderHook(() => useNotificationStore((s) => s.unreadCount), {
      wrapper: createWrapper("user1"),
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/notifications?page=1&pageSize=100");
    });

    await waitFor(() => {
      expect(useNotificationStore.getState().unreadCount).toBe(2);
    });
  });

  it("should not fetch when userId is undefined", () => {
    renderHook(() => useNotificationStore((s) => s.unreadCount), {
      wrapper: createWrapper(),
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should handle fetch error gracefully", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    renderHook(() => useNotificationStore((s) => s.unreadCount), {
      wrapper: createWrapper("user1"),
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Should remain at 0 (no crash)
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});
