// features/search/hooks/useSearch.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginationMeta } from "@/types/api";
import type { SkillSummary } from "@/features/skills/types";

interface SearchParams {
  q: string;
  tag?: string[];
  sort?: string;
  page?: number;
}

async function search(params: SearchParams): Promise<{ data: SkillSummary[]; meta: PaginationMeta }> {
  const query = new URLSearchParams({ q: params.q });
  if (params.sort) query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));
  params.tag?.forEach((t) => query.append("tag", t));

  const res = await fetch(`/api/v1/skills?${query.toString()}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json() as Promise<{ data: SkillSummary[]; meta: PaginationMeta }>;
}

export function useSearch(params: SearchParams) {
  return useQuery({
    queryKey: ["search", params],
    queryFn: () => search(params),
    staleTime: 30_000,
    enabled: Boolean(params.q),
  });
}
