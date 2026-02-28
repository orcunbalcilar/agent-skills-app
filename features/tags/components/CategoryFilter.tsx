// features/tags/components/CategoryFilter.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { useTags } from '../hooks/useTags';

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
    <div className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide">Categories</h2>
      <div className="flex flex-wrap gap-2">
        {systemTags.map((tag) => {
          const isSelected = selected.includes(tag.id);
          return (
            <Badge
              key={tag.id}
              variant={isSelected ? 'default' : 'outline'}
              className={[
                'cursor-pointer gap-1.5 px-3 py-1.5 text-sm transition-all',
                isSelected ? 'shadow-sm' : 'hover:bg-accent hover:text-accent-foreground',
              ].join(' ')}
              onClick={() => toggleTag(tag.id)}
            >
              <Star className={`size-3 ${isSelected ? 'fill-current' : ''}`} />
              {tag.name}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
