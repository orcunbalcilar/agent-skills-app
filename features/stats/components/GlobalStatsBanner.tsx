// features/stats/components/GlobalStatsBanner.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useGlobalStats } from "../hooks/useGlobalStats";

export function GlobalStatsBanner() {
  const { data } = useGlobalStats();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="border-border/50 hover-lift overflow-hidden relative">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardContent className="flex flex-col items-center justify-center py-8 relative">
          <span className="text-5xl font-bold gradient-text tracking-tight">
            {data?.skillCount?.toLocaleString() ?? "—"}
          </span>
          <span className="text-sm text-muted-foreground mt-1 font-medium">Total Skills</span>
        </CardContent>
      </Card>
      <Card className="border-border/50 hover-lift overflow-hidden relative">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardContent className="flex flex-col items-center justify-center py-8 relative">
          <span className="text-5xl font-bold gradient-text tracking-tight">
            {data?.downloadCount?.toLocaleString() ?? "—"}
          </span>
          <span className="text-sm text-muted-foreground mt-1 font-medium">Total Downloads</span>
        </CardContent>
      </Card>
    </div>
  );
}
