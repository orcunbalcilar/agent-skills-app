// tests/unit/hooks/use-skill-mutations.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useToggleFollow, useUpdateSkill } from "@/features/skills/hooks/useSkillMutations";

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

describe("useToggleFollow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should POST when not following", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });

    const { result } = renderHook(() => useToggleFollow("s1", false), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/skills/s1/follow",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should DELETE when already following", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });

    const { result } = renderHook(() => useToggleFollow("s1", true), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/skills/s1/follow",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("should handle error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Not Found" }),
    });

    const { result } = renderHook(() => useToggleFollow("s1", false), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync();
      }),
    ).rejects.toThrow();
  });
});

describe("useUpdateSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should PATCH with editMessage and files", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "s1", version: 2 } }),
    });

    const { result } = renderHook(() => useUpdateSkill(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: "s1",
        name: "updated",
        files: [{ path: "SKILL.md", content: "new" }],
        editMessage: "Updated description",
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/skills/s1",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("editMessage"),
      }),
    );
  });

  it("should PATCH with tags for tag removal", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "s1" } }),
    });

    const { result } = renderHook(() => useUpdateSkill(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: "s1",
        tags: ["ai"],
      });
    });

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.tags).toEqual(["ai"]);
  });
});
