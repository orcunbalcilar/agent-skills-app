// features/stats/components/GlobalStatsBanner.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGlobalStats } from '../hooks/useGlobalStats';

export function GlobalStatsBanner() {
  const { data } = useGlobalStats();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="border-border/50 hover-lift relative overflow-hidden">
        <div className="from-primary/5 pointer-events-none absolute inset-0 bg-linear-to-br to-transparent" />
        <CardContent className="relative flex flex-col items-center justify-center py-8">
          <span className="gradient-text text-5xl font-bold tracking-tight">
            {data?.skillCount?.toLocaleString() ?? '—'}
          </span>
          <span className="text-muted-foreground mt-1 text-sm font-medium">Total Skills</span>
        </CardContent>
      </Card>
      <Card className="border-border/50 hover-lift relative overflow-hidden">
        <div className="from-primary/5 pointer-events-none absolute inset-0 bg-linear-to-br to-transparent" />
        <CardContent className="relative flex flex-col items-center justify-center py-8">
          <span className="gradient-text text-5xl font-bold tracking-tight">
            {data?.downloadCount?.toLocaleString() ?? '—'}
          </span>
          <span className="text-muted-foreground mt-1 text-sm font-medium">Total Downloads</span>
        </CardContent>
      </Card>
    </div>
  );
}
