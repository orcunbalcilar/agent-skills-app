// src/app/(main)/skills/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { SkillDetail } from "@/features/skills/components/SkillDetail";
import { useSkill } from "@/features/skills/hooks/useSkill";
import { Skeleton } from "@/components/ui/skeleton";

export default function SkillDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useSkill(params.id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive">Failed to load skill.</p>;
  }

  return <SkillDetail skill={data} />;
}
