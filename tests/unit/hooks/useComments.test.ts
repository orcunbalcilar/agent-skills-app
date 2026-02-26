// tests/unit/hooks/useComments.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  useComments,
  useCreateComment,
  useEditComment,
  useDeleteComment,
  useToggleCommentReaction,
} from "@/features/comments/hooks/useComments";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useComments", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("should fetch comments for a skill", async () => {
    const data = {
      data: [{ id: "c1", content: "Hello", author: { id: "u1", name: "User" } }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });

    const { result } = renderHook(() => useComments("s1", 1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/skills/s1/comments?page=1");
  });

  it("should not fetch when skillId is empty", () => {
    const { result } = renderHook(() => useComments("", 1), { wrapper: createWrapper() });
    expect(result.current.isFetching).toBe(false);
  });

  it("should throw on error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useComments("s1", 1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should create a comment", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "c1", content: "New comment" } }),
    });

    const { result } = renderHook(() => useCreateComment("s1"), { wrapper: createWrapper() });
    result.current.mutate("New comment");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/skills/s1/comments",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should handle create error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "content is required" }),
    });

    const { result } = renderHook(() => useCreateComment("s1"), { wrapper: createWrapper() });
    result.current.mutate("");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("content is required");
  });

  it("should handle create error with fallback message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useCreateComment("s1"), { wrapper: createWrapper() });
    result.current.mutate("test");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Request failed");
  });
});

describe("useEditComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should edit a comment", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "c1", content: "Edited" } }),
    });

    const { result } = renderHook(() => useEditComment("s1"), { wrapper: createWrapper() });
    result.current.mutate({ commentId: "c1", content: "Edited" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/comments/c1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("useDeleteComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should delete a comment", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { deleted: true } }),
    });

    const { result } = renderHook(() => useDeleteComment("s1"), { wrapper: createWrapper() });
    result.current.mutate("c1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/comments/c1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("useToggleCommentReaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should toggle a reaction on a comment", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { toggled: "THUMBS_UP" } }),
    });

    const { result } = renderHook(() => useToggleCommentReaction("s1"), { wrapper: createWrapper() });
    result.current.mutate({ commentId: "c1", emoji: "THUMBS_UP" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/comments/c1/reactions",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
