// src/app/(main)/skills/[id]/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function SkillLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
