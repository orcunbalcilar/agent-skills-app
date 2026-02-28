// components/layout/Header.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotificationStore } from '@/stores/notification-store';
import { useUIStore } from '@/stores/ui-store';
import { Bell, LogOut, Moon, Settings, Sun, User } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface HeaderUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface HeaderProps {
  user?: HeaderUser;
}

export function Header({ user }: Readonly<HeaderProps>) {
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const theme = useUIStore((s) => s.theme);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="border-border/50 bg-background/80 sticky top-0 z-50 flex h-14 items-center gap-4 border-b px-4 backdrop-blur-xl">
      <Link href="/" className="gradient-text shrink-0 text-lg font-bold tracking-tight">
        Skills
      </Link>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label="Toggle dark/light mode"
          className="h-8 w-8 rounded-full p-0"
        >
          {theme === 'dark' ? (
            <Sun className="size-4" data-testid="icon-sun" />
          ) : (
            <Moon className="size-4" data-testid="icon-moon" />
          )}
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0"
                aria-label="User menu"
              >
                <Avatar className="ring-primary/20 hover:ring-primary/40 h-8 w-8 ring-2 transition-all">
                  <AvatarImage src={user.image ?? undefined} alt={user.name ?? 'User'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {initials ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                {unreadCount > 0 && (
                  <Badge className="glow-accent animate-fade-in absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center p-0 text-[10px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/notifications" className="flex items-center gap-2">
                  <Bell className="size-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto flex h-5 min-w-5 items-center justify-center p-0 text-[10px]"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/notifications/preferences" className="flex items-center gap-2">
                  <Settings className="size-4" />
                  Preferences
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="flex items-center gap-2"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm">
            <Link href="/auth/signin">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
