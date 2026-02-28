// features/notifications/components/NotificationBell.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/stores/notification-store';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationBell() {
  const { unreadCount, setUnreadCount, incrementUnreadCount } = useNotificationStore();
  const { data } = useNotifications(1);

  useEffect(() => {
    if (data?.data) {
      const count = data.data.filter((n) => !n.read).length;
      setUnreadCount(count);
    }
  }, [data, setUnreadCount]);

  useEffect(() => {
    const es = new EventSource('/api/v1/sse/notifications');
    es.onmessage = () => {
      incrementUnreadCount();
    };
    return () => es.close();
  }, [incrementUnreadCount]);

  return (
    <Button variant="ghost" size="sm" asChild className="relative">
      <Link href="/notifications">
        <Bell className="size-4" aria-label="Notifications" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 flex size-5 items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
