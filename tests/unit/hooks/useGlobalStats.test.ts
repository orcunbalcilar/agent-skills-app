// tests/unit/hooks/useGlobalStats.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock EventSource
const mockEventSourceInstances: Array<{
  onmessage: ((e: { data: string }) => void) | null;
  close: ReturnType<typeof vi.fn>;
}> = [];

vi.stubGlobal(
  'EventSource',
  class MockEventSource {
    onmessage: ((e: { data: string }) => void) | null = null;
    close = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_url: string) {
      mockEventSourceInstances.push(this);
    }
  },
);

import { useGlobalStats } from '@/features/stats/hooks/useGlobalStats';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useGlobalStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSourceInstances.length = 0;
  });
  afterEach(() => vi.restoreAllMocks());

  it('should fetch and merge with SSE updates', async () => {
    // Two fetches for skills and downloads
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ meta: { total: 100 } }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ meta: { total: 500 } }) });

    const { result } = renderHook(() => useGlobalStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.skillCount).toBe(100);
    expect(result.current.data?.downloadCount).toBe(500);
  });

  it('should update from SSE events', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ meta: { total: 100 } }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ meta: { total: 500 } }) });

    const { result } = renderHook(() => useGlobalStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Simulate SSE message
    const es = mockEventSourceInstances[0];
    if (es?.onmessage) {
      act(() => {
        es.onmessage!({ data: JSON.stringify({ skillCount: 101 }) });
      });
    }

    await waitFor(() => expect(result.current.data?.skillCount).toBe(101));
  });

  it('should close EventSource on unmount', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ meta: { total: 10 } }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ meta: { total: 50 } }) });

    const { unmount } = renderHook(() => useGlobalStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockEventSourceInstances.length).toBeGreaterThan(0));
    unmount();
    expect(mockEventSourceInstances[0].close).toHaveBeenCalled();
  });

  it('should handle malformed SSE data', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ meta: { total: 10 } }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ meta: { total: 50 } }) });

    const { result } = renderHook(() => useGlobalStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const es = mockEventSourceInstances[0];
    if (es?.onmessage) {
      act(() => {
        es.onmessage!({ data: 'not-json' });
      });
    }

    // Should not crash, stats remain unchanged
    expect(result.current.data?.skillCount).toBe(10);
  });
});
