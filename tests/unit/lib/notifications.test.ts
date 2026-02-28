// tests/unit/lib/notifications.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/sse', () => ({
  pgNotify: vi.fn().mockResolvedValue(undefined),
}));

import { dispatchNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

describe('dispatchNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do nothing when recipientIds is empty', async () => {
    await dispatchNotification('NEW_COMMENT', [], { skillId: 's1' });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('should fetch users and create notifications', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', notificationPreferences: {} },
      { id: 'u2', notificationPreferences: {} },
    ] as never);

    vi.mocked(prisma.$transaction).mockResolvedValue([
      { id: 'n1', userId: 'u1' },
      { id: 'n2', userId: 'u2' },
    ]);

    await dispatchNotification('NEW_COMMENT', ['u1', 'u2'], {
      skillId: 's1',
      skillName: 'test-skill',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] } },
      select: { id: true, notificationPreferences: true },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should respect user notification preferences', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', notificationPreferences: { NEW_COMMENT: false } },
      { id: 'u2', notificationPreferences: {} },
    ] as never);

    vi.mocked(prisma.$transaction).mockResolvedValue([{ id: 'n1', userId: 'u2' }]);

    await dispatchNotification('NEW_COMMENT', ['u1', 'u2'], {
      skillId: 's1',
    });

    // Transaction should only create notification for u2
    const txCalls = vi.mocked(prisma.$transaction).mock.calls;
    expect(txCalls[0][0]).toHaveLength(1);
  });

  it('should skip all if no eligible users', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', notificationPreferences: { SKILL_RELEASED: false } },
    ] as never);

    await dispatchNotification('SKILL_RELEASED', ['u1'], {
      skillId: 's1',
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should handle payload without skillId', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', notificationPreferences: {} },
    ] as never);

    vi.mocked(prisma.$transaction).mockResolvedValue([{ id: 'n1', userId: 'u1' }]);

    await dispatchNotification('NEW_COMMENT', ['u1'], {
      actorName: 'Someone',
    } as never);

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
