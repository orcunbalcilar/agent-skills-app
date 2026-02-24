// src/features/skills/hooks/useSkills.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginationMeta } from "@/types/api";
import type { SearchParams, SkillSummary } from "../types";

async function fetchSkills(params: SearchParams): Promise<{ data: SkillSummary[]; meta: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.ownerId) query.set("ownerId", params.ownerId);
  if (params.sort) query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  params.tag?.forEach((t) => query.append("tag", t));

  const res = await fetch(`/api/v1/skills?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch skills");
  return res.json() as Promise<{ data: SkillSummary[]; meta: PaginationMeta }>;
}

export function useSkills(params: SearchParams = {}) {
  return useQuery({
    queryKey: ["skills", params],
    queryFn: () => fetchSkills(params),
    staleTime: 60_000,
  });
}
