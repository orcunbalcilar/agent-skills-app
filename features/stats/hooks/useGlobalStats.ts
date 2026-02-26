// features/stats/hooks/useGlobalStats.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface GlobalStats {
  skillCount: number;
  downloadCount: number;
}

async function fetchStats(): Promise<GlobalStats> {
  const [skillsRes, downloadsRes] = await Promise.all([
    fetch("/api/v1/skills?pageSize=1"),
    fetch("/api/v1/skills?pageSize=1"),
  ]);
  const skills = await skillsRes.json() as { meta: { total: number } };
  const dl = await downloadsRes.json() as { meta: { total: number } };
  return { skillCount: skills.meta.total, downloadCount: dl.meta.total };
}

export function useGlobalStats() {
  const [liveStats, setLiveStats] = useState<Partial<GlobalStats>>({});

  const query = useQuery({
    queryKey: ["global-stats"],
    queryFn: fetchStats,
    staleTime: 60_000,
  });

  useEffect(() => {
    const es = new EventSource("/api/v1/sse/stats");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as { skillCount?: number; downloadCount?: number };
        setLiveStats((prev) => ({ ...prev, ...data }));
      } catch {
        // ignore malformed data
      }
    };
    return () => es.close();
  }, []);

  return {
    ...query,
    data: query.data
      ? { ...query.data, ...liveStats }
      : undefined,
  };
}
