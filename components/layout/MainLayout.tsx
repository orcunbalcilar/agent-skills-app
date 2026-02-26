// components/layout/MainLayout.tsx
"use client";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
  user?: { name?: string | null; email?: string | null; image?: string | null };
  isAdmin?: boolean;
}

export function MainLayout({
  children,
  user,
  isAdmin,
}: Readonly<MainLayoutProps>) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isAdmin={isAdmin} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
