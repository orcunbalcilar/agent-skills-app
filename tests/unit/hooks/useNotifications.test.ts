// tests/unit/hooks/useNotifications.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useUpdateNotificationPreferences,
} from "@/features/notifications/hooks/useNotifications";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useNotifications", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("should fetch notifications", async () => {
    const data = { data: [{ id: "n1", type: "NEW_COMMENT", read: false }], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });

    const { result } = renderHook(() => useNotifications(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/notifications?page=1");
  });

  it("should throw on failed fetch", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useNotifications(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to fetch notifications");
  });
});

describe("useMarkNotificationRead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should mark a notification as read", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { updated: true } }) });

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: createWrapper() });
    result.current.mutate("n1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/notifications/n1/read", expect.objectContaining({ method: "PATCH" }));
  });

  it("should throw on error response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "Bad request" }) });

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: createWrapper() });
    result.current.mutate("n1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Bad request");
  });

  it("should use fallback error message", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: createWrapper() });
    result.current.mutate("n1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Request failed");
  });
});

describe("useMarkAllNotificationsRead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should mark all as read", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { updated: 5 } }) });

    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper: createWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/notifications/read-all", expect.objectContaining({ method: "POST" }));
  });
});

describe("useUpdateNotificationPreferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should update preferences", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { updated: true } }) });

    const { result } = renderHook(() => useUpdateNotificationPreferences(), { wrapper: createWrapper() });
    result.current.mutate({ NEW_COMMENT: false, NEW_FOLLOWER: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/notifications/preferences",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
