// tests/unit/stores/notification-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationStore } from "@/stores/notification-store";

describe("useNotificationStore", () => {
  beforeEach(() => {
    useNotificationStore.getState().setUnreadCount(0);
  });

  it("should start with 0 unread count", () => {
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("should set unread count", () => {
    useNotificationStore.getState().setUnreadCount(5);
    expect(useNotificationStore.getState().unreadCount).toBe(5);
  });

  it("should increment unread count", () => {
    useNotificationStore.getState().setUnreadCount(3);
    useNotificationStore.getState().incrementUnreadCount();
    expect(useNotificationStore.getState().unreadCount).toBe(4);
  });

  it("should increment from zero", () => {
    useNotificationStore.getState().incrementUnreadCount();
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });
});
