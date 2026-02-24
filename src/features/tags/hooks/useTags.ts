// src/features/tags/hooks/useTags.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Tag {
  id: string;
  name: string;
  isSystem: boolean;
  createdAt: string;
}

async function fetchTags(): Promise<Tag[]> {
  const res = await fetch("/api/v1/tags");
  if (!res.ok) throw new Error("Failed to fetch tags");
  const json = await res.json() as { data: Tag[] };
  return json.data;
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    staleTime: 300_000,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/v1/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Failed to create tag");
      }
      return res.json() as Promise<{ data: Tag }>;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/tags/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Failed to delete tag");
      }
      return res.json() as Promise<{ data: unknown }>;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); },
  });
}
