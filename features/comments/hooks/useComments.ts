// features/comments/hooks/useComments.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationMeta } from "@/types/api";

export interface Comment {
  id: string;
  skillId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: { id: string; name: string; avatarUrl: string | null };
  reactions: Array<{ emoji: string; userId: string }>;
}

async function fetchComments(
  skillId: string,
  page = 1
): Promise<{ data: Comment[]; meta: PaginationMeta }> {
  const res = await fetch(`/api/v1/skills/${skillId}/comments?page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json() as Promise<{ data: Comment[]; meta: PaginationMeta }>;
}

export function useComments(skillId: string, page = 1) {
  return useQuery({
    queryKey: ["comments", skillId, page],
    queryFn: () => fetchComments(skillId, page),
    staleTime: 30_000,
    enabled: Boolean(skillId),
  });
}

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(err.error ?? "Request failed");
  }
  return res.json() as Promise<{ data: unknown }>;
}

export function useCreateComment(skillId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api(`/api/v1/skills/${skillId}/comments`, "POST", { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["comments", skillId] }); },
  });
}

export function useEditComment(skillId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      api(`/api/v1/comments/${commentId}`, "PATCH", { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["comments", skillId] }); },
  });
}

export function useDeleteComment(skillId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api(`/api/v1/comments/${commentId}`, "DELETE"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["comments", skillId] }); },
  });
}

export function useToggleCommentReaction(skillId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, emoji }: { commentId: string; emoji: string }) =>
      api(`/api/v1/comments/${commentId}/reactions`, "POST", { emoji }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["comments", skillId] }); },
  });
}
