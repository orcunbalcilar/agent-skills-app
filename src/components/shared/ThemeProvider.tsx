// src/components/shared/ThemeProvider.tsx
"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = globalThis.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return <>{children}</>;
}
