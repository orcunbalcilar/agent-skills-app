// features/skills/hooks/useSkill.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { SkillSummary } from "../types";

async function fetchSkill(id: string): Promise<SkillSummary> {
  const res = await fetch(`/api/v1/skills/${id}`);
  if (!res.ok) throw new Error("Failed to fetch skill");
  const json = await res.json() as { data: SkillSummary };
  return json.data;
}

export function useSkill(id: string) {
  return useQuery({
    queryKey: ["skill", id],
    queryFn: () => fetchSkill(id),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}
