import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth(async function proxy(req) {
  const isAuth = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // Skip static assets and internal Next.js routes based on matcher pattern
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return;
  }

  const isAuthPage = pathname.startsWith("/auth");
  const isAuthApi = pathname.startsWith("/api/auth");
  const isProtectedApi = pathname.startsWith("/api/v1");

  // Allow auth pages and auth API freely
  if (isAuthPage || isAuthApi) return;

  // Protect API routes — return 401 for unauthenticated requests
  if (isProtectedApi && !isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect unauthenticated users to sign-in for pages
  if (!isAuth) {
    const signIn = new URL("/auth/signin", req.nextUrl.origin);
    signIn.searchParams.set("callbackUrl", pathname);
    return Response.redirect(signIn);
  }
});

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
