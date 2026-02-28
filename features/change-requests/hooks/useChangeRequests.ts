// features/change-requests/hooks/useChangeRequests.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationMeta } from '@/types/api';

export interface ChangeRequest {
  id: string;
  skillId: string;
  requesterId: string;
  title: string;
  description: string;
  status: 'OPEN' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester: { id: string; name: string; avatarUrl: string | null };
}

async function fetchChangeRequests(
  skillId: string,
  page = 1,
): Promise<{ data: ChangeRequest[]; meta: PaginationMeta }> {
  const res = await fetch(`/api/v1/skills/${skillId}/requests?page=${page}`);
  if (!res.ok) throw new Error('Failed to fetch change requests');
  return res.json() as Promise<{ data: ChangeRequest[]; meta: PaginationMeta }>;
}

export function useChangeRequests(skillId: string, page = 1) {
  return useQuery({
    queryKey: ['change-requests', skillId, page],
    queryFn: () => fetchChangeRequests(skillId, page),
    staleTime: 60_000,
    enabled: Boolean(skillId),
  });
}

async function postRequest(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json() as Promise<{ data: unknown }>;
}

export function useSubmitChangeRequest(skillId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      postRequest(`/api/v1/skills/${skillId}/requests`, 'POST', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-requests', skillId] });
    },
  });
}

export function useApproveChangeRequest(skillId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => postRequest(`/api/v1/requests/${requestId}/approve`, 'POST'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-requests', skillId] });
      qc.invalidateQueries({ queryKey: ['skill', skillId] });
    },
  });
}

export function useRejectChangeRequest(skillId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => postRequest(`/api/v1/requests/${requestId}/reject`, 'POST'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-requests', skillId] });
    },
  });
}

export function useWithdrawChangeRequest(skillId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => postRequest(`/api/v1/requests/${requestId}`, 'DELETE'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-requests', skillId] });
    },
  });
}
