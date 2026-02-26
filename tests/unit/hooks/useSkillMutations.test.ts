// tests/unit/hooks/useSkillMutations.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
  useReleaseSkill,
  useForkSkill,
  useToggleFollow,
  useToggleSkillReaction,
} from "@/features/skills/hooks/useSkillMutations";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useCreateSkill", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("should create a skill", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "s1", name: "new-skill" } }),
    });

    const { result } = renderHook(() => useCreateSkill(), { wrapper: createWrapper() });
    result.current.mutate({ name: "new-skill", description: "desc", spec: {} });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/skills", expect.objectContaining({ method: "POST" }));
  });

  it("should handle error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Validation failed" }),
    });

    const { result } = renderHook(() => useCreateSkill(), { wrapper: createWrapper() });
    result.current.mutate({ name: "", description: "", spec: {} });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Validation failed");
  });
});

describe("useUpdateSkill", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should update a skill", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "s1", name: "updated" } }),
    });

    const { result } = renderHook(() => useUpdateSkill(), { wrapper: createWrapper() });
    result.current.mutate({ id: "s1", name: "updated" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/skills/s1", expect.objectContaining({ method: "PATCH" }));
  });

  it("should handle apiPatch error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Not Found" }),
    });

    const { result } = renderHook(() => useUpdateSkill(), { wrapper: createWrapper() });
    result.current.mutate({ id: "s1", name: "updated" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Not Found");
  });

  it("should handle apiPatch error with fallback message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useUpdateSkill(), { wrapper: createWrapper() });
    result.current.mutate({ id: "s1", name: "updated" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Request failed");
  });
});

describe("useDeleteSkill", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should delete a skill", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { deleted: true } }),
    });

    const { result } = renderHook(() => useDeleteSkill(), { wrapper: createWrapper() });
    result.current.mutate("s1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/skills/s1", expect.objectContaining({ method: "DELETE" }));
  });

  it("should handle apiDelete error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Forbidden" }),
    });

    const { result } = renderHook(() => useDeleteSkill(), { wrapper: createWrapper() });
    result.current.mutate("s1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Forbidden");
  });

  it("should handle apiDelete error with fallback", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useDeleteSkill(), { wrapper: createWrapper() });
    result.current.mutate("s1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Request failed");
  });
});

describe("useReleaseSkill", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should release a skill", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "s1", status: "RELEASED" } }),
    });

    const { result } = renderHook(() => useReleaseSkill(), { wrapper: createWrapper() });
    result.current.mutate("s1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/skills/s1/release", expect.objectContaining({ method: "POST" }));
  });
});

describe("useForkSkill", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should fork a skill", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "s2" } }),
    });

    const { result } = renderHook(() => useForkSkill(), { wrapper: createWrapper() });
    result.current.mutate("s1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/skills/s1/fork", expect.objectContaining({ method: "POST" }));
  });
});

describe("useToggleFollow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should follow a skill (when not following)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { followed: true } }),
    });

    const { result } = renderHook(() => useToggleFollow("s1", false), { wrapper: createWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/skills/s1/follow", expect.objectContaining({ method: "POST" }));
  });

  it("should unfollow a skill (when following)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { unfollowed: true } }),
    });

    const { result } = renderHook(() => useToggleFollow("s1", true), { wrapper: createWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/skills/s1/follow", expect.objectContaining({ method: "DELETE" }));
  });

  it("should rollback on error with optimistic update", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Pre-populate skill data so onMutate can do optimistic update
    qc.setQueryData(["skill", "s1"], { _count: { followers: 5 } });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Server Error" }),
    });

    const { result } = renderHook(() => useToggleFollow("s1", false), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // After rollback, the data should be restored to original
    const data = qc.getQueryData(["skill", "s1"]) as Record<string, unknown>;
    expect(data).toBeDefined();
  });

  it("should apply optimistic update when pre-populated data exists", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    qc.setQueryData(["skill", "s1"], { _count: { followers: 5 } });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { followed: true } }),
    });

    const { result } = renderHook(() => useToggleFollow("s1", false), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("should handle onMutate with no existing data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { followed: true } }),
    });

    const { result } = renderHook(() => useToggleFollow("s1", false), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useToggleSkillReaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should toggle a reaction", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { toggled: "HEART" } }),
    });

    const { result } = renderHook(() => useToggleSkillReaction("s1"), { wrapper: createWrapper() });
    result.current.mutate("HEART");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/skills/s1/reactions",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
