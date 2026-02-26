// lib/notifications.ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { pgNotify } from "@/lib/sse";

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

export interface NotificationPayload {
  skillId?: string;
  skillName?: string;
  actorId?: string;
  actorName?: string;
  requestId?: string;
  commentId?: string;
  [key: string]: unknown;
}

export async function dispatchNotification(
  type: NotificationType,
  recipientIds: string[],
  payload: NotificationPayload
): Promise<void> {
  if (recipientIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: recipientIds } },
    select: { id: true, notificationPreferences: true },
  });

  type UserPrefs = { id: string; notificationPreferences: unknown };
  const eligibleIds = (users as UserPrefs[])
    .filter((u) => {
      const prefs = u.notificationPreferences as Record<string, boolean>;
      return prefs[type] !== false;
    })
    .map((u) => u.id);

  if (eligibleIds.length === 0) return;

  const notifications = await prisma.$transaction(
    eligibleIds.map((userId: string) =>
      prisma.notification.create({
        data: {
          userId,
          type,
          payload: payload as unknown as Prisma.InputJsonValue,
          skillId: payload.skillId ?? null,
        },
      })
    )
  );

  // Fire NOTIFY for each recipient via pg
  await Promise.allSettled(
    (notifications as { userId: string }[]).map((n) =>
      pgNotify(`notifications:${n.userId}`, JSON.stringify(n)).catch(() => {
        // Non-fatal: SSE is best-effort
      })
    )
  );
}
