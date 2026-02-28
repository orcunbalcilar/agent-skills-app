// features/skills/types.ts
export interface SkillOwnerUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface SkillOwner {
  skillId: string;
  userId: string;
  assignedAt: string;
  user: SkillOwnerUser;
}

export interface TagRecord {
  id: string;
  name: string;
  isSystem: boolean;
}

export interface SkillTagRecord {
  skillId: string;
  tagId: string;
  tag: TagRecord;
}

export interface SkillReactionRecord {
  id: string;
  skillId: string;
  userId: string;
  emoji: string;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  status: 'TEMPLATE' | 'RELEASED';
  version: number;
  forkedFromId: string | null;
  forkCount: number;
  downloadCount: number;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owners: SkillOwner[];
  tags: SkillTagRecord[];
  reactions?: SkillReactionRecord[];
  reactionCounts?: Record<string, number>;
  _count?: { comments: number; followers: number; changeRequests: number };
}

export interface SkillDetail extends SkillSummary {
  spec: Record<string, unknown>;
  files?: Array<{ path: string; content: string }>;
  followers?: Array<{ userId: string }>;
  followerSnapshots?: Array<{ snapshotDate: string; count: number }>;
}

export interface SkillStats {
  downloadCount: number;
  forkCount: number;
  followerCount: number;
  commentCount: number;
  changeRequestCount: number;
  reactionCounts: Record<string, number>;
}

export interface SearchParams {
  q?: string;
  tag?: string[];
  status?: string;
  ownerId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}
