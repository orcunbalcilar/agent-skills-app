// src/app/(main)/skills/page.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SkillCard } from "@/features/skills/components/SkillCard";
import { SearchBar } from "@/features/search/components/SearchBar";
import { TagSelector } from "@/features/tags/components/TagSelector";
import { Pagination } from "@/components/shared/Pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSkills } from "@/features/skills/hooks/useSkills";

const SORT_OPTIONS = [
  { value: "most_downloaded", label: "Most Downloaded" },
  { value: "newest", label: "Newest" },
  { value: "most_followed", label: "Most Followed" },
  { value: "recently_updated", label: "Recently Updated" },
  { value: "alphabetical", label: "Alphabetical" },
] as const;

export default function SkillsPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("most_downloaded");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data, isLoading } = useSkills({
    q: initialQuery || undefined,
    sort,
    tag: selectedTags.length > 0 ? selectedTags : undefined,
    page,
    pageSize: 12,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Discover Skills</h1>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <SearchBar defaultValue={initialQuery} />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Filter by tags:</p>
        <TagSelector selected={selectedTags} onChange={setSelectedTags} max={10} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>

          {data?.data.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No skills found.</p>
          )}

          {data?.meta && data.meta.totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={data.meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
