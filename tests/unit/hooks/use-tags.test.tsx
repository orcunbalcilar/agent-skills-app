// tests/unit/hooks/use-tags.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTags, useCreateTag, useDeleteTag } from "@/features/tags/hooks/useTags";

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch tags", async () => {
    const tags = [{ id: "t1", name: "react", isSystem: true }];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: tags }),
    });

    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(tags);
  });

  it("should throw on network error", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a tag", async () => {
    const tag = { id: "t1", name: "new-tag", isSystem: false };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: tag }),
    });

    const { result } = renderHook(() => useCreateTag(), { wrapper: createWrapper() });
    result.current.mutate("new-tag");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/tags", expect.objectContaining({
      method: "POST",
    }));
  });
});

describe("useDeleteTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a tag", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });

    const { result } = renderHook(() => useDeleteTag(), { wrapper: createWrapper() });
    result.current.mutate("t1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/tags/t1", expect.objectContaining({
      method: "DELETE",
    }));
  });
});
