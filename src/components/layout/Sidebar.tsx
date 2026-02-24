// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/skills", label: "Discover Skills", icon: "🔍" },
  { href: "/skills/new", label: "Create Skill", icon: "✨" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const ADMIN_ITEMS = [
  { href: "/admin", label: "Admin Panel", icon: "⚙️" },
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
      <aside className="w-12 border-r bg-background flex flex-col items-center pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          →
        </Button>
      </aside>
    );
  }

  return (
    <aside className="w-56 border-r bg-background flex flex-col">
      <div className="flex justify-end p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          ←
        </Button>
      </div>

      <nav className="flex-1 px-2 pb-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                ].join(" ")}
              >
                <span aria-hidden>{item.icon}</span>
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
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")}
                  >
                    <span aria-hidden>{item.icon}</span>
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
