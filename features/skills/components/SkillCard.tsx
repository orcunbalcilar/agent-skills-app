// features/skills/components/SkillCard.tsx
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Download,
  Eye,
  GitFork,
  Heart,
  PartyPopper,
  Rocket,
  ThumbsDown,
  ThumbsUp,
  CircleHelp,
  Laugh,
  Users,
} from "lucide-react";
import type { SkillSummary } from "../types";
import type { LucideIcon } from "lucide-react";

const REACTION_ICONS: Record<string, LucideIcon> = {
  THUMBS_UP: ThumbsUp,
  THUMBS_DOWN: ThumbsDown,
  LAUGH: Laugh,
  HOORAY: PartyPopper,
  CONFUSED: CircleHelp,
  HEART: Heart,
  ROCKET: Rocket,
  EYES: Eye,
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
    <Card className="hover-lift group border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Link href={`/skills/${skill.id}`}>
            <CardTitle className="text-base hover:text-primary transition-colors line-clamp-1">
              {skill.name}
            </CardTitle>
          </Link>
          <div className="flex gap-1 shrink-0 ml-2">
            <Badge variant={skill.status === "RELEASED" ? "default" : "secondary"} className="text-xs">
              {skill.status === "RELEASED" ? `v${skill.version}` : "template"}
            </Badge>
            {skill.forkedFromId && (
              <Badge variant="outline" className="text-xs border-border/50 flex items-center gap-0.5">
                <GitFork className="size-3" />
                forked
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{skill.description}</p>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-center gap-1.5 mb-2">
          {skill.owners?.slice(0, 3).map((o) => (
            <Avatar key={o.userId} className="h-5 w-5 ring-1 ring-border/50">
              <AvatarImage src={o.user.avatarUrl ?? undefined} alt={o.user.name} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{o.user.name[0]}</AvatarFallback>
            </Avatar>
          ))}
          {skill.owners?.length > 3 && (
            <span className="text-xs text-muted-foreground">+{skill.owners.length - 3}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {displayTags.map((st) => (
            <Badge key={st.tagId} variant="outline" className="text-xs px-1.5 py-0 border-border/50 text-muted-foreground">
              {st.tag.name}
            </Badge>
          ))}
          {extraTags > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">+{extraTags}</Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex justify-between text-xs text-muted-foreground border-t border-border/30">
        <div className="flex gap-3">
          <span aria-label="Downloads" className="flex items-center gap-1">
            <Download className="size-3.5" />
            {skill.downloadCount}
          </span>
          <span aria-label="Followers" className="flex items-center gap-1">
            <Users className="size-3.5" />
            {skill._count?.followers ?? 0}
          </span>
          <span aria-label="Forks" className="flex items-center gap-1">
            <GitFork className="size-3.5" />
            {skill.forkCount}
          </span>
        </div>
        <div className="flex gap-1.5">
          {topReactions.map(([emoji, count]) => {
            const Icon = REACTION_ICONS[emoji];
            return (
              <span key={emoji} className="flex items-center gap-0.5">
                {Icon ? <Icon className="size-3.5" /> : emoji}
                <span>{count}</span>
              </span>
            );
          })}
        </div>
      </CardFooter>
    </Card>
  );
}
