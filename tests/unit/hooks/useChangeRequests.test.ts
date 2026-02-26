// tests/unit/hooks/useChangeRequests.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  useChangeRequests,
  useSubmitChangeRequest,
  useApproveChangeRequest,
  useRejectChangeRequest,
  useWithdrawChangeRequest,
} from "@/features/change-requests/hooks/useChangeRequests";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useChangeRequests", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("should fetch change requests for a skill", async () => {
    const data = {
      data: [{ id: "r1", status: "OPEN", title: "Fix typo" }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });

    const { result } = renderHook(() => useChangeRequests("s1", 1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/skills/s1/requests?page=1");
  });

  it("should not fetch when skillId is empty", () => {
    const { result } = renderHook(() => useChangeRequests("", 1), { wrapper: createWrapper() });
    expect(result.current.isFetching).toBe(false);
  });

  it("should throw on error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useChangeRequests("s1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useSubmitChangeRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should submit a change request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "r1", status: "OPEN" } }),
    });

    const { result } = renderHook(() => useSubmitChangeRequest("s1"), { wrapper: createWrapper() });
    result.current.mutate({ title: "Fix bug", description: "There is a bug" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/skills/s1/requests",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should handle submit error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "title required" }),
    });

    const { result } = renderHook(() => useSubmitChangeRequest("s1"), { wrapper: createWrapper() });
    result.current.mutate({ title: "", description: "" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("title required");
  });

  it("should handle submit error with fallback", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useSubmitChangeRequest("s1"), { wrapper: createWrapper() });
    result.current.mutate({ title: "t", description: "d" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Request failed");
  });
});

describe("useApproveChangeRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should approve a change request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "r1", status: "APPROVED" } }),
    });

    const { result } = renderHook(() => useApproveChangeRequest("s1"), { wrapper: createWrapper() });
    result.current.mutate("r1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/requests/r1/approve",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("useRejectChangeRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should reject a change request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "r1", status: "REJECTED" } }),
    });

    const { result } = renderHook(() => useRejectChangeRequest("s1"), { wrapper: createWrapper() });
    result.current.mutate("r1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/requests/r1/reject",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("useWithdrawChangeRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should withdraw a change request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { withdrawn: true } }),
    });

    const { result } = renderHook(() => useWithdrawChangeRequest("s1"), { wrapper: createWrapper() });
    result.current.mutate("r1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/requests/r1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
