// app/(auth)/auth/signin/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center relative">
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
      <Card className="w-full max-w-sm border-border/50 shadow-xl animate-fade-in relative">
        <div className="absolute inset-0 rounded-[inherit] bg-linear-to-br from-primary/3 to-transparent pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="text-center text-xl">
            <span className="gradient-text font-bold">Agent Skills</span>
            <p className="text-sm text-muted-foreground font-normal mt-1">Sign in to continue</p>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          <Button
            className="w-full"
            onClick={() => signIn("github", { callbackUrl: "/" })}
          >
            Sign in with GitHub
          </Button>

          {isDev && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Dev only
                  </span>
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
                  signIn("credentials", {
                    email,
                    password,
                    callbackUrl: "/",
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
