// src/app/(main)/skills/[id]/edit/page.tsx
"use client";

import { useParams } from "next/navigation";
import { SkillForm } from "@/features/skills/components/SkillForm";
import { useSkill } from "@/features/skills/hooks/useSkill";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditSkillPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useSkill(params.id);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-destructive">Skill not found.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <SkillForm
        mode="edit"
        initialData={{
          id: data.id,
          name: data.name,
          description: data.description,
          spec: (data as unknown as { spec: Record<string, unknown> }).spec ?? {},
          tags: data.tags.map((t) => t.tagId),
          status: data.status,
        }}
      />
    </div>
  );
}
