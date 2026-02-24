// src/app/(main)/layout.tsx
import { MainLayout } from "@/components/layout/MainLayout";

export default function MainGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MainLayout>{children}</MainLayout>;
}
