// app/(main)/profile/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/shared/Pagination";
import { SkillCard } from "@/features/skills/components/SkillCard";
import { useMe, useUserSkills } from "@/features/users/hooks/useUser";
import { useSkills } from "@/features/skills/hooks/useSkills";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const [releasedPage, setReleasedPage] = useState(1);
  const [templatePage, setTemplatePage] = useState(1);

  const { data: released } = useUserSkills(user?.id ?? "", releasedPage);
  const { data: templates } = useSkills({
    status: "TEMPLATE",
    ownerId: user?.id,
    page: templatePage,
    pageSize: 6,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  if (!user) return <p className="text-destructive">Not signed in.</p>;

  return (
    <div className="space-y-8 animate-fade-in">
      <Card className="border-border/50 overflow-hidden relative">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 ring-2 ring-primary/20 shadow-lg">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/notifications/preferences">Notification Preferences</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section>
        <h2 className="text-xl font-semibold mb-4">Released Skills</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {released?.data.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
        {released?.data.length === 0 && (
          <p className="text-muted-foreground">No released skills.</p>
        )}
        {released?.meta && released.meta.totalPages > 1 && (
          <Pagination page={releasedPage} totalPages={released.meta.totalPages} onPageChange={setReleasedPage} />
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Templates</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates?.data.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
        {templates?.data.length === 0 && (
          <p className="text-muted-foreground">No templates.</p>
        )}
        {templates?.meta && templates.meta.totalPages > 1 && (
          <Pagination page={templatePage} totalPages={templates.meta.totalPages} onPageChange={setTemplatePage} />
        )}
      </section>
    </div>
  );
}
