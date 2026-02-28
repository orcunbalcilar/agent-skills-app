// tests/unit/hooks/use-skill-versions.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSkillVersions, useSkillVersion } from '@/features/skills/hooks/useSkillVersions';

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

describe('useSkillVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch paginated versions', async () => {
    const versions = [
      {
        id: 'v1',
        skillId: 's1',
        version: 2,
        message: 'update',
        createdAt: '2025-01-01T00:00:00Z',
        editedBy: { id: 'u1', name: 'User', avatarUrl: null },
      },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: versions,
          meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        }),
    });

    const { result } = renderHook(() => useSkillVersions('s1', 1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].version).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/skills/s1/versions?page=1&pageSize=20');
  });

  it('should handle error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useSkillVersions('s1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should not fetch when skillId is empty', async () => {
    const { result } = renderHook(() => useSkillVersions(''), {
      wrapper: createWrapper(),
    });

    // Query should remain in idle/pending state and never fire
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
  });
});

describe('useSkillVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch a single version', async () => {
    const versionDetail = {
      id: 'v1',
      skillId: 's1',
      version: 1,
      spec: { name: 'test' },
      files: [{ path: 'SKILL.md', content: '# Skill' }],
      message: 'initial',
      createdAt: '2025-01-01T00:00:00Z',
      editedBy: { id: 'u1', name: 'User', avatarUrl: null },
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(versionDetail),
    });

    const { result } = renderHook(() => useSkillVersion('s1', 1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.spec).toEqual({ name: 'test' });
    expect(result.current.data?.files).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/skills/s1/versions/1');
  });

  it('should not fetch when version is null', async () => {
    const { result } = renderHook(() => useSkillVersion('s1', null), {
      wrapper: createWrapper(),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
  });
});
