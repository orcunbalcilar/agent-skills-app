// tests/unit/lib/auth-config.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('auth.config', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('should export pages config with signIn', async () => {
    const config = (await import('../../../auth.config')).default;
    expect(config.pages).toBeDefined();
    expect(config.pages?.signIn).toBe('/auth/signin');
  });

  it('should have providers array', async () => {
    const config = (await import('../../../auth.config')).default;
    expect(config.providers).toBeDefined();
    expect(Array.isArray(config.providers)).toBe(true);
    expect(config.providers.length).toBeGreaterThan(0);
  });

  it('should include GitHub provider', async () => {
    const config = (await import('../../../auth.config')).default;
    const hasGithub = config.providers.some((p) => {
      if (typeof p === 'function') return false;
      return p.id === 'github' || p.name === 'GitHub';
    });
    expect(hasGithub).toBe(true);
  });

  it('should enable allowDangerousEmailAccountLinking on GitHub provider', async () => {
    const config = (await import('../../../auth.config')).default;
    const github = config.providers.find((p) => {
      if (typeof p === 'function') return false;
      return p.id === 'github' || p.name === 'GitHub';
    });
    expect(github).toBeDefined();
    if (github && typeof github !== 'function') {
      const options = (github as { options?: { allowDangerousEmailAccountLinking?: boolean } })
        .options;
      expect(options?.allowDangerousEmailAccountLinking).toBe(true);
    }
  });

  // In test env (NODE_ENV=test), credentials provider is NOT added
  // because it only activates in NODE_ENV=development
  it('should not include credentials provider in test environment', async () => {
    const config = (await import('../../../auth.config')).default;
    const hasCreds = config.providers.some((p) => {
      if (typeof p === 'function') return false;
      return p.id === 'credentials' || p.name === 'E2E Test Credentials';
    });
    // In test (not development), credentials should not be present
    expect(hasCreds).toBe(false);
  });
});
