// tests/unit/hooks/use-notifications.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications/hooks/useNotifications';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch notifications for page 1', async () => {
    const notifs = [{ id: 'n1', type: 'NEW_COMMENT', read: false }];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: notifs,
          meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
        }),
    });

    const { result } = renderHook(() => useNotifications(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/notifications?page=1');
  });

  it('should handle error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useMarkNotificationRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark notification as read', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'n1', read: true } }),
    });

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: createWrapper(),
    });
    result.current.mutate('n1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/notifications/n1/read',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('useMarkAllNotificationsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark all notifications as read', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { count: 5 } }),
    });

    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper: createWrapper(),
    });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/notifications/read-all',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
