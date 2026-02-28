// features/skills/hooks/useSkillStats.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import type { SkillStats } from '../types';

async function fetchSkillStats(id: string): Promise<SkillStats> {
  const res = await fetch(`/api/v1/skills/${id}/stats`);
  if (!res.ok) throw new Error('Failed to fetch skill stats');
  const json = (await res.json()) as { data: SkillStats };
  return json.data;
}

export function useSkillStats(id: string) {
  return useQuery({
    queryKey: ['skill-stats', id],
    queryFn: () => fetchSkillStats(id),
    staleTime: 30_000,
    enabled: Boolean(id),
  });
}
