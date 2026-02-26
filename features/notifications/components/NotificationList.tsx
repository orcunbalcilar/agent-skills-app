// features/notifications/components/NotificationList.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/shared/Pagination";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "../hooks/useNotifications";

const TYPE_LABELS: Record<string, string> = {
  NEW_COMMENT: "💬 New Comment",
  CHANGE_REQUEST_SUBMITTED: "📝 Change Request Submitted",
  CHANGE_REQUEST_APPROVED: "✅ Change Request Approved",
  CHANGE_REQUEST_REJECTED: "❌ Change Request Rejected",
  NEW_FOLLOWER: "👤 New Follower",
  SKILL_RELEASED: "🚀 Skill Released",
  SKILL_FORKED: "🔀 Skill Forked",
  OWNER_ADDED: "➕ Owner Added",
  OWNER_REMOVED: "➖ Owner Removed",
};

export function NotificationList() {
  const [page, setPage] = useState(1);
  const { data } = useNotifications(page);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((n) => {
          const payload = n.payload as { skillId?: string; actorName?: string; skillName?: string };
          return (
            <Card
              key={n.id}
              className={n.read ? "opacity-60" : ""}
            >
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {TYPE_LABELS[n.type] ?? n.type}
                  </span>
                  {!n.read && <Badge variant="default" className="text-xs">New</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  {payload.skillId && (
                    <Link
                      href={`/skills/${payload.skillId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {payload.skillName ?? "View Skill"}
                    </Link>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead.mutate(n.id)}
                      disabled={markRead.isPending}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {notifications.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No notifications.</p>
      )}

      {data?.meta && data.meta.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
