import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
    setupFiles: ['./tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 100,
        functions: 98,
        branches: 99,
        statements: 100,
      },
      exclude: [
        'components/ui/**',
        'app/**/page.tsx',
        'prisma/**',
        'tests/**',
        '**/*.config.*',
        'app/layout.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
