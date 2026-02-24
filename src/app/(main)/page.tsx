// src/app/(main)/page.tsx
"use client";

import { SkillCard } from "@/features/skills/components/SkillCard";
import { GlobalStatsBanner } from "@/features/stats/components/GlobalStatsBanner";
import { useSkills } from "@/features/skills/hooks/useSkills";

export default function HomePage() {
  const { data: latest } = useSkills({ status: "RELEASED", sort: "newest", pageSize: 6 });
  const { data: trending } = useSkills({ status: "RELEASED", sort: "most_downloaded", pageSize: 6 });

  return (
    <div className="space-y-8">
      <GlobalStatsBanner />

      <section>
        <h2 className="text-xl font-semibold mb-4">Latest Released</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latest?.data.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Trending</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trending?.data.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      </section>
    </div>
  );
}
