// features/notifications/hooks/useNotifications.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationMeta } from "@/types/api";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

async function fetchNotifications(
  page = 1
): Promise<{ data: NotificationItem[]; meta: PaginationMeta }> {
  const res = await fetch(`/api/v1/notifications?page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json() as Promise<{ data: NotificationItem[]; meta: PaginationMeta }>;
}

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: ["notifications", page],
    queryFn: () => fetchNotifications(page),
    staleTime: 30_000,
  });
}

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(err.error ?? "Request failed");
  }
  return res.json() as Promise<{ data: unknown }>;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/v1/notifications/${id}/read`, "PATCH"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/api/v1/notifications/read-all", "POST"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Record<string, boolean>) =>
      api("/api/v1/notifications/preferences", "PATCH", prefs),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["user-me"] }); },
  });
}
