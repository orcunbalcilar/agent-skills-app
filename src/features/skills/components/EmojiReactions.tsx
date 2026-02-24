// src/features/skills/components/EmojiReactions.tsx
"use client";

import { Button } from "@/components/ui/button";

const EMOJIS: Array<{ key: string; symbol: string; label: string }> = [
  { key: "THUMBS_UP", symbol: "👍", label: "Thumbs up" },
  { key: "THUMBS_DOWN", symbol: "👎", label: "Thumbs down" },
  { key: "LAUGH", symbol: "😄", label: "Laugh" },
  { key: "HOORAY", symbol: "🎉", label: "Hooray" },
  { key: "CONFUSED", symbol: "😕", label: "Confused" },
  { key: "HEART", symbol: "❤️", label: "Heart" },
  { key: "ROCKET", symbol: "🚀", label: "Rocket" },
  { key: "EYES", symbol: "👀", label: "Eyes" },
];

interface EmojiReactionsProps {
  counts: Record<string, number>;
  userReactions?: string[];
  onToggle?(emoji: string): void;
  disabled?: boolean;
}

export function EmojiReactions({
  counts,
  userReactions = [],
  onToggle,
  disabled,
}: Readonly<EmojiReactionsProps>) {
  const active = new Set(userReactions);

  return (
    <fieldset className="flex flex-wrap gap-1 border-none p-0 m-0">
      <legend className="sr-only">Emoji reactions</legend>
      {EMOJIS.map(({ key, symbol, label }) => {
        const count = counts[key] ?? 0;
        const isActive = active.has(key);

        if (count === 0 && disabled) return null;

        return (
          <Button
            key={key}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 gap-1 text-xs"
            onClick={() => onToggle?.(key)}
            disabled={disabled}
            aria-label={count > 0 ? `${label} (${count})` : label}
            aria-pressed={isActive}
          >
            <span aria-hidden>{symbol}</span>
            {count > 0 && <span>{count}</span>}
          </Button>
        );
      })}
      </fieldset>
  );
}
