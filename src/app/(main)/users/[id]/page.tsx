// src/app/(main)/users/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { UserProfile } from "@/features/users/components/UserProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

interface UserData {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export default function UserPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/users/${params.id}/skills?pageSize=1`)
      .then((r) => r.json())
      .then(() => {
        // Use the params id since we don't have a dedicated user endpoint
        setUser({
          id: params.id,
          name: "User",
          avatarUrl: null,
          role: "USER",
          createdAt: new Date().toISOString(),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  if (!user) return <p className="text-destructive">User not found.</p>;

  return <UserProfile user={user} />;
}
