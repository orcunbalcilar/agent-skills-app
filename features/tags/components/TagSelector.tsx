// features/tags/components/TagSelector.tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star } from 'lucide-react';
import { useTags, useCreateTag } from '../hooks/useTags';

interface TagSelectorProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}

export function TagSelector({ selected, onChange, max = 10 }: Readonly<TagSelectorProps>) {
  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const [customInput, setCustomInput] = useState('');

  const toggleTag = (tagId: string) => {
    if (selected.includes(tagId)) {
      onChange(selected.filter((t) => t !== tagId));
    } else if (selected.length < max) {
      onChange([...selected, tagId]);
    }
  };

  const handleAddCustom = async () => {
    const trimmed = customInput.trim().toLowerCase();
    if (!trimmed) return;
    const existing = tags?.find((t) => t.name === trimmed);
    if (existing) {
      if (!selected.includes(existing.id)) {
        toggleTag(existing.id);
      }
    } else {
      try {
        const result = await createTag.mutateAsync(trimmed);
        const newTag = result.data;
        if (!selected.includes(newTag.id) && selected.length < max) {
          onChange([...selected, newTag.id]);
        }
      } catch {
        // tag creation failed
      }
    }
    setCustomInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags?.map((tag) => (
          <Badge
            key={tag.id}
            variant={selected.includes(tag.id) ? 'default' : 'outline'}
            className={`cursor-pointer ${tag.isSystem ? 'border-primary/50' : ''}`}
            onClick={() => toggleTag(tag.id)}
          >
            {tag.isSystem && <Star className="size-3 fill-current" />}
            {tag.name}
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Add custom tag..."
          className="max-w-48"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustom();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCustom}
          disabled={createTag.isPending || selected.length >= max}
        >
          Add
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {selected.length}/{max} tags selected
      </p>
    </div>
  );
}
