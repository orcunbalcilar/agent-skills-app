// src/lib/auth.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

type Role = "ADMIN" | "USER";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: String(profile.id),
          githubId: String(profile.id),
          name: profile.name ?? profile.login,
          email: profile.email ?? `${profile.login}@github.invalid`,
          avatarUrl: profile.avatar_url,
          image: profile.avatar_url,
          role: "USER" as Role,
        };
      },
    }),
    ...(process.env.NODE_ENV === "development"
      ? [
          Credentials({
            id: "credentials",
            name: "E2E Test Credentials",
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              if (!credentials?.email || !credentials?.password) return null;

              const adminEmail = process.env.E2E_ADMIN_EMAIL;
              const adminPwd = process.env.E2E_ADMIN_PASSWORD;
              const userEmail = process.env.E2E_USER_EMAIL;
              const userPwd = process.env.E2E_USER_PASSWORD;

              const isAdmin =
                credentials.email === adminEmail &&
                credentials.password === adminPwd;
              const isUser =
                credentials.email === userEmail &&
                credentials.password === userPwd;

              if (!isAdmin && !isUser) return null;

              const user = await prisma.user.findUnique({
                where: { email: credentials.email as string },
              });
              if (!user) return null;

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.avatarUrl,
                role: user.role,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, role: true, githubId: true },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async signIn({ user, account }) {
      if (account?.provider === "github" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (!existing) {
          await prisma.user.create({
            data: {
              githubId: String(account.providerAccountId),
              email: user.email,
              name: user.name ?? "Unknown",
              avatarUrl: user.image ?? null,
              role: "USER",
            },
          });
        }
      }
      return true;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: Role;
    };
  }
  interface User {
    role?: Role;
  }
}
