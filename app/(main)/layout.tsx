// app/(main)/layout.tsx
import { MainLayout } from "@/components/layout/MainLayout";
import { auth } from "@/lib/auth";

export default async function MainGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : undefined;
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const userId = (session?.user as { id?: string } | undefined)?.id;

  return (
    <MainLayout user={user} userId={userId} isAdmin={isAdmin}>
      {children}
    </MainLayout>
  );
}
