// features/users/hooks/useUser.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationMeta } from '@/types/api';
import type { SkillSummary } from '@/features/skills/types';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'USER';
  notificationPreferences: Record<string, boolean>;
  createdAt: string;
  _count?: { ownedSkills: number; followers: number };
}

async function fetchMe(): Promise<UserProfile> {
  const res = await fetch('/api/v1/users/me');
  if (!res.ok) throw new Error('Failed to fetch user profile');
  const json = (await res.json()) as { data: UserProfile };
  return json.data;
}

export function useMe() {
  return useQuery({
    queryKey: ['user-me'],
    queryFn: fetchMe,
    staleTime: 60_000,
  });
}

async function fetchUserSkills(
  userId: string,
  page = 1,
): Promise<{ data: SkillSummary[]; meta: PaginationMeta }> {
  const res = await fetch(`/api/v1/users/${userId}/skills?page=${page}`);
  if (!res.ok) throw new Error('Failed to fetch user skills');
  return res.json() as Promise<{ data: SkillSummary[]; meta: PaginationMeta }>;
}

export function useUserSkills(userId: string, page = 1) {
  return useQuery({
    queryKey: ['user-skills', userId, page],
    queryFn: () => fetchUserSkills(userId, page),
    staleTime: 60_000,
    enabled: Boolean(userId),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name?: string; avatarUrl?: string }) => {
      const res = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'Failed to update profile');
      }
      return res.json() as Promise<{ data: UserProfile }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-me'] });
    },
  });
}
