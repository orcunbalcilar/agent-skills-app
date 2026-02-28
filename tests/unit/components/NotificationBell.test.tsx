// tests/unit/components/NotificationBell.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

// Mock EventSource
const mockEventSourceInstances: Array<{
  onmessage: ((e: MessageEvent) => void) | null;
  close: ReturnType<typeof vi.fn>;
}> = [];

vi.stubGlobal(
  'EventSource',
  class MockEventSource {
    onmessage: ((e: MessageEvent) => void) | null = null;
    close = vi.fn();
    constructor() {
      mockEventSourceInstances.push(this);
    }
  },
);

// Mock notification store
let mockUnreadCount = 0;
const mockSetUnreadCount = vi.fn();
const mockIncrementUnreadCount = vi.fn();
vi.mock('@/stores/notification-store', () => ({
  useNotificationStore: () => ({
    unreadCount: mockUnreadCount,
    setUnreadCount: mockSetUnreadCount,
    incrementUnreadCount: mockIncrementUnreadCount,
  }),
}));

// Mock useNotifications
const mockNotifications = vi.fn().mockReturnValue({ data: null });
vi.mock('@/features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => mockNotifications(),
}));

import { NotificationBell } from '@/features/notifications/components/NotificationBell';

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSourceInstances.length = 0;
    mockUnreadCount = 0;
    mockNotifications.mockReturnValue({ data: null });
  });
  afterEach(() => vi.restoreAllMocks());

  it('should render the bell icon link', () => {
    render(<NotificationBell />);
    const link = screen.getByLabelText('Notifications').closest('a');
    expect(link).toHaveAttribute('href', '/notifications');
  });

  it('should not show badge when unread count is 0', () => {
    render(<NotificationBell />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should show badge when unread count > 0', () => {
    mockUnreadCount = 5;
    render(<NotificationBell />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should cap badge at 99+', () => {
    mockUnreadCount = 120;
    render(<NotificationBell />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('should set unread count from fetched data', async () => {
    mockNotifications.mockReturnValue({
      data: { data: [{ read: false }, { read: true }, { read: false }] },
    });

    render(<NotificationBell />);
    await waitFor(() => expect(mockSetUnreadCount).toHaveBeenCalledWith(2));
  });

  it('should create EventSource and increment on message', async () => {
    render(<NotificationBell />);
    await waitFor(() => expect(mockEventSourceInstances).toHaveLength(1));

    const es = mockEventSourceInstances[0];
    act(() => {
      es.onmessage?.(new MessageEvent('message'));
    });

    expect(mockIncrementUnreadCount).toHaveBeenCalled();
  });

  it('should close EventSource on unmount', async () => {
    const { unmount } = render(<NotificationBell />);
    await waitFor(() => expect(mockEventSourceInstances).toHaveLength(1));
    unmount();
    expect(mockEventSourceInstances[0].close).toHaveBeenCalled();
  });
});
