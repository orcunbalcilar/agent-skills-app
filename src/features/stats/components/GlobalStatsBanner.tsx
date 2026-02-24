// src/features/stats/components/GlobalStatsBanner.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useGlobalStats } from "../hooks/useGlobalStats";

export function GlobalStatsBanner() {
  const { data } = useGlobalStats();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <span className="text-4xl font-bold">
            {data?.skillCount?.toLocaleString() ?? "—"}
          </span>
          <span className="text-sm text-muted-foreground">Total Skills</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <span className="text-4xl font-bold">
            {data?.downloadCount?.toLocaleString() ?? "—"}
          </span>
          <span className="text-sm text-muted-foreground">Total Downloads</span>
        </CardContent>
      </Card>
    </div>
  );
}
