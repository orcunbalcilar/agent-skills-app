import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';

const providers: NextAuthConfig['providers'] = [
  GitHub({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    allowDangerousEmailAccountLinking: true,
  }),
];

if (process.env.NODE_ENV === 'development') {
  providers.push(
    Credentials({
      id: 'credentials',
      name: 'E2E Test Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@test.local';
        const adminPwd = process.env.E2E_ADMIN_PASSWORD ?? 'e2e-admin-password-123';
        const userEmail = process.env.E2E_USER_EMAIL ?? 'user@test.local';
        const userPwd = process.env.E2E_USER_PASSWORD ?? 'e2e-user-password-123';

        const isAdmin = credentials.email === adminEmail && credentials.password === adminPwd;
        const isUser = credentials.email === userEmail && credentials.password === userPwd;

        if (!isAdmin && !isUser) return null;

        const email = credentials.email as string;
        const name = isAdmin ? 'E2E Admin' : 'E2E User';
        const role = isAdmin ? 'ADMIN' : 'USER';

        const { prisma } = await import('@/lib/prisma');
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            githubId: `e2e-${role.toLowerCase()}`,
            email,
            name,
            role,
          },
        });

        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        };
      },
    }),
  );
}

export default {
  providers,
  pages: {
    signIn: '/auth/signin',
  },
} satisfies NextAuthConfig;
