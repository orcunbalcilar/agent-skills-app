// app/(main)/skills/new/page.tsx
import { SkillForm } from '@/features/skills/components/SkillForm';

export default function NewSkillPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <SkillForm mode="create" />
    </div>
  );
}
