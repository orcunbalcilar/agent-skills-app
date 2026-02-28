// app/(auth)/auth/signin/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="from-primary/5 to-primary/3 pointer-events-none absolute inset-0 bg-linear-to-br via-transparent" />
      <Card className="border-border/50 animate-fade-in relative w-full max-w-sm shadow-xl">
        <div className="from-primary/3 pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-br to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="text-center text-xl">
            <span className="gradient-text font-bold">Agent Skills</span>
            <p className="text-muted-foreground mt-1 text-sm font-normal">Sign in to continue</p>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <Button className="w-full" onClick={() => signIn('github', { callbackUrl: '/' })}>
            Sign in with GitHub
          </Button>

          {isDev && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">Dev only</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@test.local"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() =>
                  signIn('credentials', {
                    email,
                    password,
                    callbackUrl: '/',
                  })
                }
              >
                Sign in (Credentials)
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
