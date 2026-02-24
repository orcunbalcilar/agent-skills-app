// src/features/users/components/UserProfile.tsx
"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/shared/Pagination";
import { SkillCard } from "@/features/skills/components/SkillCard";
import { useUserSkills } from "../hooks/useUser";

interface UserProfileProps {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    createdAt: string;
  };
}

export function UserProfile({ user }: Readonly<UserProfileProps>) {
  const [page, setPage] = useState(1);
  const { data } = useUserSkills(user.id, page);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xl">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Released Skills</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
        {data?.data.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No released skills.</p>
        )}
        {data?.meta && data.meta.totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
