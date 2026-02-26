// app/(main)/skills/new/page.tsx
import { SkillForm } from "@/features/skills/components/SkillForm";

export default function NewSkillPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <SkillForm mode="create" />
    </div>
  );
}
