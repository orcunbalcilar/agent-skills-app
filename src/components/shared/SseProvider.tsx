// src/components/shared/SseProvider.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useNotificationStore } from "@/stores/notification-store";

interface SseContextValue {
  notificationsUrl: string;
}

const SseContext = createContext<SseContextValue>({
  notificationsUrl: "/api/v1/sse/notifications",
});

export function useSse() {
  return useContext(SseContext);
}

interface SseProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function SseProvider({ children, userId }: Readonly<SseProviderProps>) {
  const esRef = useRef<EventSource | null>(null);
  const incrementUnreadCount = useNotificationStore((s) => s.incrementUnreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const fetchInitialUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications?page=1&pageSize=100");
      if (!res.ok) return;
      const json = await res.json() as { data?: Array<{ read: boolean }> };
      if (json.data) {
        const unread = json.data.filter((n) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch {
      // silently fail
    }
  }, [setUnreadCount]);

  useEffect(() => {
    if (!userId) return;

    fetchInitialUnreadCount();

    const es = new EventSource("/api/v1/sse/notifications");
    esRef.current = es;

    es.onmessage = () => {
      incrementUnreadCount();
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [userId, incrementUnreadCount, fetchInitialUnreadCount]);

  const ctxValue = useMemo(
    () => ({ notificationsUrl: "/api/v1/sse/notifications" }),
    []
  );

  return (
    <SseContext.Provider value={ctxValue}>
      {children}
    </SseContext.Provider>
  );
}
