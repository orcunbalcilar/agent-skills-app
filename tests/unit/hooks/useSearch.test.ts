// tests/unit/hooks/useSearch.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { useSearch } from "@/features/search/hooks/useSearch";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useSearch", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("should search skills with query", async () => {
    const data = {
      data: [{ id: "s1", name: "test-skill" }],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });

    const { result } = renderHook(
      () => useSearch({ q: "test" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("q=test");
  });

  it("should include tags and sort in search params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } }),
    });

    renderHook(
      () => useSearch({ q: "hello", tag: ["js"], sort: "recent", page: 2 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("q=hello");
    expect(url).toContain("sort=recent");
    expect(url).toContain("page=2");
    expect(url).toContain("tag=js");
  });

  it("should not search when query is empty", () => {
    const { result } = renderHook(
      () => useSearch({ q: "" }),
      { wrapper: createWrapper() },
    );
    expect(result.current.isFetching).toBe(false);
  });

  it("should throw on error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(
      () => useSearch({ q: "test" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
