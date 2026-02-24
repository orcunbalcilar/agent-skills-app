// src/stores/ui-store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  openModals: Record<string, boolean>;
  toggleTheme(): void;
  setSidebarOpen(open: boolean): void;
  openModal(id: string): void;
  closeModal(id: string): void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: "light",
      sidebarOpen: true,
      openModals: {},
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      openModal: (id) =>
        set((state) => ({ openModals: { ...state.openModals, [id]: true } })),
      closeModal: (id) =>
        set((state) => {
          const updated = { ...state.openModals };
          delete updated[id];
          return { openModals: updated };
        }),
    }),
    {
      name: "ui-preferences",
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
