// tests/unit/stores/ui-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/stores/ui-store";

describe("useUIStore", () => {
  beforeEach(() => {
    const store = useUIStore.getState();
    // Reset to defaults
    store.setSidebarOpen(true);
    if (store.theme === "dark") store.toggleTheme();
    for (const key of Object.keys(store.openModals)) {
      store.closeModal(key);
    }
  });

  it("should have default theme as light", () => {
    expect(useUIStore.getState().theme).toBe("light");
  });

  it("should toggle theme", () => {
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe("dark");
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe("light");
  });

  it("should have sidebar open by default", () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it("should toggle sidebar", () => {
    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    useUIStore.getState().setSidebarOpen(true);
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it("should manage modals", () => {
    useUIStore.getState().openModal("test-modal");
    expect(useUIStore.getState().openModals["test-modal"]).toBe(true);
    useUIStore.getState().closeModal("test-modal");
    expect(useUIStore.getState().openModals["test-modal"]).toBeUndefined();
  });
});
