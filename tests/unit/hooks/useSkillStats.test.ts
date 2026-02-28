// tests/unit/hooks/useSkillStats.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useSkillStats } from '@/features/skills/hooks/useSkillStats';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useSkillStats', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('should fetch skill stats by id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            downloadCount: 100,
            followerCount: 50,
            commentCount: 25,
            reactionCounts: { HEART: 10 },
          },
        }),
    });

    const { result } = renderHook(() => useSkillStats('s1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.downloadCount).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/skills/s1/stats');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useSkillStats(''), { wrapper: createWrapper() });
    expect(result.current.isFetching).toBe(false);
  });

  it('should throw on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useSkillStats('s1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
