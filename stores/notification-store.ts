// stores/notification-store.ts
"use client";

import { create } from "zustand";

interface NotificationStore {
  unreadCount: number;
  setUnreadCount(count: number): void;
  incrementUnreadCount(): void;
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),
}));
