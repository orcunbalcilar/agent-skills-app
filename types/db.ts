// types/db.ts
// Re-export Prisma enums and model types for convenience across the app

export type { 
  User,
  Skill,
  SkillOwner,
  Tag,
  SkillTag,
  Follower,
  ChangeRequest,
  Comment,
  CommentReaction,
  SkillReaction,
  Notification,
  SkillDownloadEvent,
  FollowerSnapshot,
} from "@prisma/client";

export type Role = "ADMIN" | "USER";
export type SkillStatus = "TEMPLATE" | "RELEASED";
export type ChangeRequestStatus = "OPEN" | "APPROVED" | "REJECTED" | "WITHDRAWN";
export type NotificationType =
  | "NEW_COMMENT"
  | "CHANGE_REQUEST_SUBMITTED"
  | "CHANGE_REQUEST_APPROVED"
  | "CHANGE_REQUEST_REJECTED"
  | "NEW_FOLLOWER"
  | "SKILL_RELEASED"
  | "SKILL_FORKED"
  | "OWNER_ADDED"
  | "OWNER_REMOVED";
export type ReactionEmoji =
  | "THUMBS_UP"
  | "THUMBS_DOWN"
  | "LAUGH"
  | "HOORAY"
  | "CONFUSED"
  | "HEART"
  | "ROCKET"
  | "EYES";

export const EMOJI_MAP: Record<ReactionEmoji, string> = {
  THUMBS_UP: "👍",
  THUMBS_DOWN: "👎",
  LAUGH: "😄",
  HOORAY: "🎉",
  CONFUSED: "😕",
  HEART: "❤️",
  ROCKET: "🚀",
  EYES: "👀",
};

export const ALL_EMOJIS: ReactionEmoji[] = [
  "THUMBS_UP",
  "THUMBS_DOWN",
  "LAUGH",
  "HOORAY",
  "CONFUSED",
  "HEART",
  "ROCKET",
  "EYES",
];

// Extended skill type with relations
export interface SkillWithRelations {
  id: string;
  name: string;
  description: string;
  spec: unknown;
  status: SkillStatus;
  version: number;
  forkedFromId: string | null;
  forkCount: number;
  downloadCount: number;
  releasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  owners: Array<{
    skillId: string;
    userId: string;
    assignedAt: Date;
    user: { id: string; name: string; avatarUrl: string | null };
  }>;
  tags: Array<{
    skillId: string;
    tagId: string;
    tag: { id: string; name: string; isSystem: boolean };
  }>;
  reactions: Array<{
    id: string;
    skillId: string;
    userId: string;
    emoji: ReactionEmoji;
  }>;
  _count: { followers: number; comments: number };
}
