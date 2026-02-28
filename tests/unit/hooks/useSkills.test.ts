// tests/unit/hooks/useSkills.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useSkills } from '@/features/skills/hooks/useSkills';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useSkills', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('should fetch skills with default params', async () => {
    const data = {
      data: [{ id: 's1', name: 'skill-1' }],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });

    const { result } = renderHook(() => useSkills(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });

  it('should fetch skills with search params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: [], meta: { page: 2, pageSize: 5, total: 0, totalPages: 0 } }),
    });

    const { result } = renderHook(
      () =>
        useSkills({
          q: 'test',
          sort: 'popular',
          page: 2,
          pageSize: 5,
          tag: ['js', 'python'],
          status: 'RELEASED',
          ownerId: 'u1',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('q=test');
    expect(url).toContain('sort=popular');
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=5');
    expect(url).toContain('tag=js');
    expect(url).toContain('tag=python');
    expect(url).toContain('status=RELEASED');
    expect(url).toContain('ownerId=u1');
  });

  it('should throw on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useSkills(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
