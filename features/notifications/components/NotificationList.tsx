// features/notifications/components/NotificationList.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Pagination } from '@/components/shared/Pagination';
import {
  BookOpen,
  Check,
  CheckCheck,
  GitFork,
  MessageSquare,
  Rocket,
  UserMinus,
  UserPlus,
  Users,
  X,
  FileEdit,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/useNotifications';

interface TypeConfig {
  icon: LucideIcon;
  label: string;
  color: string;
}

const TYPE_MAP: Record<string, TypeConfig> = {
  NEW_COMMENT: { icon: MessageSquare, label: 'New Comment', color: 'text-blue-500' },
  CHANGE_REQUEST_SUBMITTED: { icon: FileEdit, label: 'Change Request', color: 'text-amber-500' },
  CHANGE_REQUEST_APPROVED: { icon: Check, label: 'Approved', color: 'text-green-500' },
  CHANGE_REQUEST_REJECTED: { icon: X, label: 'Rejected', color: 'text-red-500' },
  NEW_FOLLOWER: { icon: Users, label: 'New Follower', color: 'text-purple-500' },
  SKILL_RELEASED: { icon: Rocket, label: 'Released', color: 'text-primary' },
  SKILL_FORKED: { icon: GitFork, label: 'Forked', color: 'text-cyan-500' },
  OWNER_ADDED: { icon: UserPlus, label: 'Owner Added', color: 'text-green-500' },
  OWNER_REMOVED: { icon: UserMinus, label: 'Owner Removed', color: 'text-red-500' },
};

function buildDescription(type: string, payload: Record<string, unknown>): string {
  const actor = (payload.actorName as string) ?? 'Someone';
  const skill = (payload.skillName as string) ?? 'a skill';

  switch (type) {
    case 'NEW_COMMENT':
      return `${actor} commented on ${skill}`;
    case 'CHANGE_REQUEST_SUBMITTED':
      return `${actor} submitted a change request on ${skill}`;
    case 'CHANGE_REQUEST_APPROVED':
      return `${actor} approved your change request on ${skill}`;
    case 'CHANGE_REQUEST_REJECTED':
      return `${actor} rejected your change request on ${skill}`;
    case 'NEW_FOLLOWER':
      return `${actor} started following ${skill}`;
    case 'SKILL_RELEASED':
      return `${skill} was released by ${actor}`;
    case 'SKILL_FORKED':
      return `${actor} forked ${skill}`;
    case 'OWNER_ADDED':
      return `You were added as owner of ${skill}`;
    case 'OWNER_REMOVED':
      return `You were removed as owner of ${skill}`;
    default:
      return `${actor} interacted with ${skill}`;
  }
}

export function NotificationList() {
  const [page, setPage] = useState(1);
  const { data } = useNotifications(page);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="gradient-text text-2xl font-bold">Notifications</h1>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5"
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((n) => {
          const payload: Record<string, unknown> = n.payload ?? {};
          const config = TYPE_MAP[n.type] ?? {
            icon: BookOpen,
            label: n.type,
            color: 'text-muted-foreground',
          };
          const Icon = config.icon;
          const rawActor = typeof payload.actorName === 'string' ? payload.actorName : '';
          const actorInitial = (rawActor || '?')[0].toUpperCase();
          const date = new Date(n.createdAt);
          const timeAgo = Number.isNaN(date.getTime())
            ? 'unknown'
            : formatDistanceToNow(date, { addSuffix: true });
          const skillId = payload?.skillId as string | undefined;
          const skillName = payload?.skillName as string | undefined;

          return (
            <Card
              key={n.id}
              className={`border-border/50 transition-all duration-200 ${
                n.read ? 'opacity-60' : 'border-l-primary hover-lift border-l-2'
              }`}
            >
              <CardContent className="flex items-start gap-3 py-3">
                {/* Actor avatar */}
                <Avatar className="mt-0.5 size-9 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {actorInitial}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className={`size-4 shrink-0 ${config.color}`} />
                    <Badge variant={n.read ? 'outline' : 'default'} className="text-xs">
                      {config.label}
                    </Badge>
                    {!n.read && (
                      <span
                        className="bg-primary size-2 animate-pulse rounded-full"
                        aria-label="Unread"
                      />
                    )}
                  </div>

                  <p className="text-sm leading-snug">{buildDescription(n.type, payload)}</p>

                  {/* Skill link */}
                  {skillId && (
                    <Link
                      href={`/skills/${skillId}`}
                      className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                    >
                      <BookOpen className="size-3" />
                      {skillName ?? 'View Skill'}
                    </Link>
                  )}

                  <p className="text-muted-foreground text-xs">{timeAgo}</p>
                </div>

                {/* Actions */}
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => markRead.mutate(n.id)}
                    disabled={markRead.isPending}
                  >
                    <Check className="mr-1 size-3.5" />
                    Read
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {notifications.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">No notifications.</p>
      )}

      {data?.meta && data.meta.totalPages > 1 && (
        <Pagination page={page} totalPages={data.meta.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
