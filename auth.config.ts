import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

const providers: NextAuthConfig["providers"] = [
  GitHub({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  }),
];

if (process.env.NODE_ENV === "development") {
  providers.push(
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

        return {
          id: credentials.email as string,
          email: credentials.email as string,
          name: isAdmin ? "E2E Admin" : "E2E User",
        };
      },
    })
  );
}

export default {
  providers,
  pages: {
    signIn: "/auth/signin",
  },
} satisfies NextAuthConfig;
