// app/(main)/page.tsx
"use client";

import { SkillCard } from "@/features/skills/components/SkillCard";
import { GlobalStatsBanner } from "@/features/stats/components/GlobalStatsBanner";
import { useSkills } from "@/features/skills/hooks/useSkills";
import { Rocket, TrendingUp } from "lucide-react";

export default function HomePage() {
  const { data: latest } = useSkills({ status: "RELEASED", sort: "newest", pageSize: 6 });
  const { data: trending } = useSkills({ status: "RELEASED", sort: "most_downloaded", pageSize: 6 });

  return (
    <div className="space-y-10">
      <GlobalStatsBanner />

      <section className="animate-fade-in [animation-delay:0.1s]">
        <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
          <Rocket className="size-5 text-primary" />
          <span>Latest Released</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latest?.data.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      </section>

      <section className="animate-fade-in [animation-delay:0.2s]">
        <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
          <TrendingUp className="size-5 text-primary" />
          <span>Trending</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trending?.data.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      </section>
    </div>
  );
}
