// tests/unit/hooks/useUser.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useMe, useUserSkills, useUpdateMe } from '@/features/users/hooks/useUser';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useMe', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('should fetch current user profile', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'u1', name: 'User', role: 'USER' } }),
    });

    const { result } = renderHook(() => useMe(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('User');
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/users/me');
  });

  it('should throw on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const { result } = renderHook(() => useMe(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUserSkills', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should fetch user skills', async () => {
    const data = {
      data: [{ id: 's1', name: 'skill' }],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });

    const { result } = renderHook(() => useUserSkills('u1', 1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/users/u1/skills?page=1');
  });

  it('should not fetch when userId is empty', () => {
    const { result } = renderHook(() => useUserSkills('', 1), { wrapper: createWrapper() });
    expect(result.current.isFetching).toBe(false);
  });

  it('should throw on fetch error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useUserSkills('u1', 1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to fetch user skills');
  });
});

describe('useUpdateMe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update user profile', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'u1', name: 'New Name' } }),
    });

    const { result } = renderHook(() => useUpdateMe(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'New Name' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/users/me',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('should throw on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Validation failed' }),
    });

    const { result } = renderHook(() => useUpdateMe(), { wrapper: createWrapper() });
    result.current.mutate({ name: '' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Validation failed');
  });

  it('should use fallback error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useUpdateMe(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'name' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to update profile');
  });
});
