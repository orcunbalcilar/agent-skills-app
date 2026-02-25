// src/features/skills/hooks/useSkillVersions.ts
"use client";

import { useQuery } from "@tanstack/react-query";

interface VersionSummary {
  id: string;
  skillId: string;
  version: number;
  message: string | null;
  createdAt: string;
  editedBy: { id: string; name: string; avatarUrl: string | null } | null;
}

interface VersionDetail extends VersionSummary {
  spec: Record<string, unknown>;
  files: Array<{ path: string; content: string }> | null;
}

interface PaginatedVersions {
  data: VersionSummary[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

async function fetchVersions(skillId: string, page: number): Promise<PaginatedVersions> {
  const res = await fetch(`/api/v1/skills/${skillId}/versions?page=${page}&pageSize=20`);
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json() as Promise<PaginatedVersions>;
}

async function fetchVersion(skillId: string, version: number): Promise<VersionDetail> {
  const res = await fetch(`/api/v1/skills/${skillId}/versions/${version}`);
  if (!res.ok) throw new Error("Failed to fetch version");
  return res.json() as Promise<VersionDetail>;
}

export function useSkillVersions(skillId: string, page = 1) {
  return useQuery({
    queryKey: ["skill-versions", skillId, page],
    queryFn: () => fetchVersions(skillId, page),
    staleTime: 30_000,
    enabled: Boolean(skillId),
  });
}

export function useSkillVersion(skillId: string, version: number | null) {
  return useQuery({
    queryKey: ["skill-version", skillId, version],
    queryFn: () => fetchVersion(skillId, version!),
    staleTime: 60_000,
    enabled: Boolean(skillId) && version !== null,
  });
}

export type { VersionSummary, VersionDetail };
