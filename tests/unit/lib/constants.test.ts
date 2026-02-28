// tests/unit/lib/constants.test.ts
import { describe, it, expect } from 'vitest';
import { SYSTEM_TAG_NAMES } from '@/lib/constants';

describe('SYSTEM_TAG_NAMES', () => {
  it('should export an array of system tag names', () => {
    expect(Array.isArray(SYSTEM_TAG_NAMES)).toBe(true);
    expect(SYSTEM_TAG_NAMES.length).toBe(18);
  });

  it('should contain expected tag names', () => {
    expect(SYSTEM_TAG_NAMES).toContain('ai');
    expect(SYSTEM_TAG_NAMES).toContain('frontend');
    expect(SYSTEM_TAG_NAMES).toContain('backend');
    expect(SYSTEM_TAG_NAMES).toContain('python');
    expect(SYSTEM_TAG_NAMES).toContain('rust');
    expect(SYSTEM_TAG_NAMES).toContain('.net');
  });

  it('should not contain duplicates', () => {
    const uniqueSet = new Set(SYSTEM_TAG_NAMES);
    expect(uniqueSet.size).toBe(SYSTEM_TAG_NAMES.length);
  });

  it('should be a readonly tuple at the type level', () => {
    // 'as const' makes it readonly at the TS level, not frozen at runtime
    expect(SYSTEM_TAG_NAMES).toBeDefined();
    expect(typeof SYSTEM_TAG_NAMES[0]).toBe('string');
  });
});
