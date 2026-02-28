// features/skills/hooks/useSkillMutations.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateSkillInput {
  name: string;
  description: string;
  spec: Record<string, unknown>;
  files?: Array<{ path: string; content: string }>;
  tags?: string[];
}

interface UpdateSkillInput {
  id: string;
  name?: string;
  description?: string;
  spec?: Record<string, unknown>;
  files?: Array<{ path: string; content: string }>;
  tags?: string[];
  editMessage?: string;
}

async function apiPost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json() as Promise<{ data: unknown }>;
}

async function apiPatch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json() as Promise<{ data: unknown }>;
}

async function apiDelete(url: string) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json() as Promise<{ data: unknown }>;
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSkillInput) => apiPost('/api/v1/skills', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateSkillInput) => apiPatch(`/api/v1/skills/${id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['skill', vars.id] });
      qc.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/skills/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useReleaseSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/api/v1/skills/${id}/release`, {}),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['skill', id] });
      qc.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useForkSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/api/v1/skills/${id}/fork`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useToggleFollow(skillId: string, isFollowing: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      isFollowing
        ? apiDelete(`/api/v1/skills/${skillId}/follow`)
        : apiPost(`/api/v1/skills/${skillId}/follow`, {}),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['skill', skillId] });
      const previous = qc.getQueryData(['skill', skillId]);
      qc.setQueryData(['skill', skillId], (old: Record<string, unknown> | undefined) => {
        if (!old) return old;
        const count = (old._count as Record<string, number>) ?? {};
        return {
          ...old,
          _count: {
            ...count,
            followers: (count.followers ?? 0) + (isFollowing ? -1 : 1),
          },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['skill', skillId], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['skill', skillId] });
    },
  });
}

export function useToggleSkillReaction(skillId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (emoji: string) => apiPost(`/api/v1/skills/${skillId}/reactions`, { emoji }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill', skillId] });
    },
  });
}
