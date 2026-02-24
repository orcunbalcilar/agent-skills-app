// src/components/shared/SseProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
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

  useEffect(() => {
    if (!userId) return;

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
  }, [userId, incrementUnreadCount]);

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
