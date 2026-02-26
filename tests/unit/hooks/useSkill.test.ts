// tests/unit/hooks/useSkill.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { useSkill } from "@/features/skills/hooks/useSkill";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useSkill", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("should fetch a skill by id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "s1", name: "test-skill" } }),
    });

    const { result } = renderHook(() => useSkill("s1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe("test-skill");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/skills/s1");
  });

  it("should not fetch when id is empty", () => {
    const { result } = renderHook(() => useSkill(""), { wrapper: createWrapper() });
    expect(result.current.isFetching).toBe(false);
  });

  it("should throw on error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const { result } = renderHook(() => useSkill("s1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to fetch skill");
  });
});
