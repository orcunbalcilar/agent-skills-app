// components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Home, PanelLeft, Search, Settings, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/skills", label: "Discover Skills", icon: Search },
  { href: "/skills/new", label: "Create Skill", icon: Sparkles },
];

const ADMIN_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Admin Panel", icon: Settings },
];

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  if (!sidebarOpen) {
    return (
      <aside className="w-12 border-r border-border/50 bg-background/60 backdrop-blur-lg flex flex-col items-center pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          className="rounded-full h-8 w-8 p-0"
        >
          <PanelLeft className="size-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="w-56 border-r border-border/50 bg-background/60 backdrop-blur-lg flex flex-col">
      <div className="flex justify-end p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="rounded-full h-8 w-8 p-0"
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      <nav className="flex-1 px-2 pb-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground shadow-sm glow-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                ].join(" ")}
              >
                <item.icon aria-hidden className="size-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {isAdmin && (
          <>
            <Separator className="my-4" />
            <ul className="space-y-1">
              {ADMIN_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={[
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground shadow-sm glow-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")}
                  >
                    <item.icon aria-hidden className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
    </aside>
  );
}
