// tests/unit/types/api.test.ts
import { describe, it, expect } from 'vitest';
import { apiSuccess, apiError } from '@/types/api';

describe('apiSuccess', () => {
  it('should return data without meta', () => {
    const result = apiSuccess({ id: '1', name: 'test' });
    expect(result).toEqual({ data: { id: '1', name: 'test' } });
    expect(result.meta).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('should return data with meta', () => {
    const meta = { page: 1, pageSize: 10, total: 50, totalPages: 5 };
    const result = apiSuccess([{ id: '1' }], meta);
    expect(result).toEqual({
      data: [{ id: '1' }],
      meta: { page: 1, pageSize: 10, total: 50, totalPages: 5 },
    });
  });

  it('should handle null data', () => {
    const result = apiSuccess(null);
    expect(result.data).toBeNull();
  });
});

describe('apiError', () => {
  it('should return error message', () => {
    const result = apiError('Something went wrong');
    expect(result).toEqual({ error: 'Something went wrong' });
    expect(result.data).toBeUndefined();
  });

  it('should return error with empty string', () => {
    const result = apiError('');
    expect(result.error).toBe('');
  });
});
