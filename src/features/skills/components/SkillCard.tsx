// src/features/skills/components/SkillCard.tsx
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SkillSummary } from "../types";

const EMOJI_MAP: Record<string, string> = {
  THUMBS_UP: "👍", THUMBS_DOWN: "👎", LAUGH: "😄", HOORAY: "🎉",
  CONFUSED: "😕", HEART: "❤️", ROCKET: "🚀", EYES: "👀",
};

interface SkillCardProps {
  skill: SkillSummary;
}

export function SkillCard({ skill }: Readonly<SkillCardProps>) {
  const displayTags = skill.tags?.slice(0, 5) ?? [];
  const extraTags = (skill.tags?.length ?? 0) - 5;
  const topReactions = Object.entries(skill.reactionCounts ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Link href={`/skills/${skill.id}`}>
            <CardTitle className="text-base hover:underline line-clamp-1">
              {skill.name}
            </CardTitle>
          </Link>
          <div className="flex gap-1 shrink-0 ml-2">
            <Badge variant={skill.status === "RELEASED" ? "default" : "secondary"}>
              {skill.status === "RELEASED" ? `v${skill.version}` : "template"}
            </Badge>
            {skill.forkedFromId && (
              <Badge variant="outline" className="text-xs">forked</Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-center gap-1 mb-2">
          {skill.owners?.slice(0, 3).map((o) => (
            <Avatar key={o.userId} className="h-5 w-5">
              <AvatarImage src={o.user.avatarUrl ?? undefined} alt={o.user.name} />
              <AvatarFallback className="text-xs">{o.user.name[0]}</AvatarFallback>
            </Avatar>
          ))}
          {skill.owners?.length > 3 && (
            <span className="text-xs text-muted-foreground">+{skill.owners.length - 3}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {displayTags.map((st) => (
            <Badge key={st.tagId} variant="outline" className="text-xs px-1.5 py-0">
              {st.tag.name}
            </Badge>
          ))}
          {extraTags > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">+{extraTags}</Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex justify-between text-xs text-muted-foreground">
        <div className="flex gap-3">
          <span aria-label="Downloads">⬇️ {skill.downloadCount}</span>
          <span aria-label="Followers">👥 {skill._count?.followers ?? 0}</span>
          <span aria-label="Forks">🍴 {skill.forkCount}</span>
        </div>
        <div className="flex gap-1">
          {topReactions.map(([emoji, count]) => (
            <span key={emoji} className="flex items-center gap-0.5">
              {EMOJI_MAP[emoji] ?? emoji}
              <span>{count}</span>
            </span>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
