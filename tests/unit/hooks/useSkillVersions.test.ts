// tests/unit/hooks/useSkillVersions.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useSkillVersions, useSkillVersion } from '@/features/skills/hooks/useSkillVersions';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useSkillVersions', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('should fetch paginated versions', async () => {
    const data = {
      data: [{ id: 'v1', skillId: 's1', version: 1, message: null, createdAt: '2024-01-01' }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });

    const { result } = renderHook(() => useSkillVersions('s1', 1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/skills/s1/versions?page=1&pageSize=20');
  });

  it('should not fetch when skillId is empty', () => {
    const { result } = renderHook(() => useSkillVersions(''), { wrapper: createWrapper() });
    expect(result.current.isFetching).toBe(false);
  });

  it('should throw on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useSkillVersions('s1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useSkillVersion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should fetch specific version', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'v1', skillId: 's1', version: 1, spec: {}, files: [] }),
    });

    const { result } = renderHook(() => useSkillVersion('s1', 1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/skills/s1/versions/1');
  });

  it('should not fetch when version is null', () => {
    const { result } = renderHook(() => useSkillVersion('s1', null), { wrapper: createWrapper() });
    expect(result.current.isFetching).toBe(false);
  });

  it('should throw on fetch error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useSkillVersion('s1', 1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to fetch version');
  });
});
