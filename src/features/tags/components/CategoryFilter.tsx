// src/features/tags/components/CategoryFilter.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { useTags } from "../hooks/useTags";

interface CategoryFilterProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export function CategoryFilter({ selected, onChange }: Readonly<CategoryFilterProps>) {
  const { data: tags } = useTags();
  const systemTags = tags?.filter((t) => t.isSystem) ?? [];

  const toggleTag = (tagId: string) => {
    if (selected.includes(tagId)) {
      onChange(selected.filter((t) => t !== tagId));
    } else {
      onChange([...selected, tagId]);
    }
  };

  if (systemTags.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-medium mb-2">Categories</p>
      <div className="flex flex-wrap gap-2">
        {systemTags.map((tag) => (
          <Badge
            key={tag.id}
            variant={selected.includes(tag.id) ? "default" : "outline"}
            className="cursor-pointer text-sm px-3 py-1"
            onClick={() => toggleTag(tag.id)}
          >
            {tag.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
