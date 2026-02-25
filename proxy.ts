import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth(async function proxy(req) {
  const isAuth = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
  const isApi = req.nextUrl.pathname.startsWith("/api");

  // Allow API and auth pages freely
  if (isApi || isAuthPage) return;

  // Redirect unauthenticated users to sign-in
  if (!isAuth) {
    const signIn = new URL("/auth/signin", req.nextUrl.origin);
    signIn.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(signIn);
  }

});
