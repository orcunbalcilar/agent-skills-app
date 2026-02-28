// tests/unit/lib/auth-session.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindUnique, mockCreate, mockUpdate, capturedCallbacks } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  capturedCallbacks: {} as Record<string, (...args: never[]) => unknown>,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

vi.mock('next-auth', () => ({
  default: vi.fn((config: { callbacks?: Record<string, (...args: never[]) => unknown> }) => {
    if (config.callbacks) {
      Object.assign(capturedCallbacks, config.callbacks);
    }
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  }),
}));

vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(),
}));

vi.mock('../../auth.config', () => ({
  default: { pages: { signIn: '/auth/signin' }, providers: [] },
}));

// Force import to trigger NextAuth() and capture callbacks
import '@/lib/auth';

// Helper to call callbacks with proper types
const sessionCb = (args: unknown) =>
  (capturedCallbacks.session as (a: unknown) => Promise<unknown>)(args);
const jwtCb = (args: unknown) => (capturedCallbacks.jwt as (a: unknown) => Promise<unknown>)(args);
const signInCb = (args: unknown) =>
  (capturedCallbacks.signIn as (a: unknown) => Promise<boolean>)(args);

describe('Auth callbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('session callback', () => {
    it('should enrich session with db user data', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'u1',
        role: 'ADMIN',
        githubId: 'gh123',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      const session = { user: { id: '', role: '', image: undefined as string | undefined } };
      const result = await sessionCb({ session, token: { sub: 'u1' } });
      const resultSession = result as typeof session;

      expect(resultSession.user.id).toBe('u1');
      expect(resultSession.user.role).toBe('ADMIN');
      expect(resultSession.user.image).toBe('https://example.com/avatar.jpg');
    });

    it('should set image to undefined when avatarUrl is null', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'u1',
        role: 'USER',
        githubId: 'gh123',
        avatarUrl: null,
      });

      const session = { user: { id: '', role: '', image: 'old' as string | undefined } };
      const result = await sessionCb({ session, token: { sub: 'u1' } });
      const resultSession = result as typeof session;

      expect(resultSession.user.image).toBeUndefined();
    });

    it('should return session unchanged when user not found in db', async () => {
      mockFindUnique.mockResolvedValue(null);

      const session = { user: { id: 'orig', role: 'USER', image: undefined } };
      const result = await sessionCb({ session, token: { sub: 'u1' } });
      const resultSession = result as typeof session;

      expect(resultSession.user.id).toBe('orig');
    });

    it('should return session unchanged when no token.sub', async () => {
      const session = { user: { id: 'orig' } };
      const result = await sessionCb({ session, token: {} });
      expect(result).toBe(session);
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it('should return session unchanged when session.user is falsy', async () => {
      const session = { user: null };
      const result = await sessionCb({ session, token: { sub: 'u1' } });
      expect(result).toEqual(session);
      expect(mockFindUnique).not.toHaveBeenCalled();
    });
  });

  describe('jwt callback', () => {
    it('should set token.sub from user.id when user exists', async () => {
      const token = { sub: undefined as string | undefined };
      const result = await jwtCb({ token, user: { id: 'user-123' } });
      expect((result as { sub: string }).sub).toBe('user-123');
    });

    it('should return token unchanged when user is undefined', async () => {
      const token = { sub: 'existing' };
      const result = await jwtCb({ token, user: undefined });
      expect((result as { sub: string }).sub).toBe('existing');
    });
  });

  describe('signIn callback', () => {
    it('should create user on github login when not existing', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({});

      const result = await signInCb({
        user: { email: 'new@example.com', name: 'New User', image: 'https://img.com/avatar' },
        account: { provider: 'github', providerAccountId: '12345' },
      });

      expect(result).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@example.com',
          name: 'New User',
          githubId: '12345',
          avatarUrl: 'https://img.com/avatar',
          role: 'USER',
        }),
      });
    });

    it('should update existing user on github login with github info', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'u1',
        email: 'existing@example.com',
        avatarUrl: null,
      });
      mockUpdate.mockResolvedValue({});

      const result = await signInCb({
        user: {
          email: 'existing@example.com',
          name: 'Existing',
          image: 'https://img.com/new-avatar',
        },
        account: { provider: 'github', providerAccountId: '123' },
      });

      expect(result).toBe(true);
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
        data: {
          githubId: '123',
          avatarUrl: 'https://img.com/new-avatar',
        },
      });
    });

    it('should preserve existing avatarUrl when github image is null', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'u1',
        email: 'existing@example.com',
        avatarUrl: 'https://old.com/avatar',
      });
      mockUpdate.mockResolvedValue({});

      const result = await signInCb({
        user: { email: 'existing@example.com', name: 'Existing', image: null },
        account: { provider: 'github', providerAccountId: '456' },
      });

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
        data: {
          githubId: '456',
          avatarUrl: 'https://old.com/avatar',
        },
      });
    });

    it('should skip creation for non-github providers', async () => {
      const result = await signInCb({
        user: { email: 'user@test.com', name: 'Test' },
        account: { provider: 'credentials' },
      });

      expect(result).toBe(true);
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it('should skip creation when github user has no email', async () => {
      const result = await signInCb({
        user: { email: undefined, name: 'No Email' },
        account: { provider: 'github', providerAccountId: '123' },
      });

      expect(result).toBe(true);
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it('should use fallback name when user.name is null', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({});

      await signInCb({
        user: { email: 'test@example.com', name: undefined, image: undefined },
        account: { provider: 'github', providerAccountId: '999' },
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Unknown',
          avatarUrl: null,
        }),
      });
    });
  });
});
