// tests/unit/hooks/useTags.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useTags, useCreateTag, useDeleteTag } from '@/features/tags/hooks/useTags';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useTags', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('should fetch tags', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 't1', name: 'javascript', isSystem: true }] }),
    });

    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('javascript');
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/tags');
  });

  it('should throw on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to fetch tags');
  });
});

describe('useCreateTag', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a tag', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 't2', name: 'python', isSystem: false } }),
    });

    const { result } = renderHook(() => useCreateTag(), { wrapper: createWrapper() });
    result.current.mutate('python');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/tags',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should throw on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Tag already exists' }),
    });

    const { result } = renderHook(() => useCreateTag(), { wrapper: createWrapper() });
    result.current.mutate('duplicate');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Tag already exists');
  });

  it('should use fallback error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useCreateTag(), { wrapper: createWrapper() });
    result.current.mutate('test');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to create tag');
  });
});

describe('useDeleteTag', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete a tag', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { deleted: true } }),
    });

    const { result } = renderHook(() => useDeleteTag(), { wrapper: createWrapper() });
    result.current.mutate('t1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/tags/t1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('should throw on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Tag is in use' }),
    });

    const { result } = renderHook(() => useDeleteTag(), { wrapper: createWrapper() });
    result.current.mutate('t1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Tag is in use');
  });

  it('should use fallback error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useDeleteTag(), { wrapper: createWrapper() });
    result.current.mutate('t1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to delete tag');
  });
});
