// components/shared/MatomoProvider.tsx
'use client';

import { useEffect } from 'react';
import { initMatomo } from '@/lib/matomo';

export function MatomoProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    initMatomo();
  }, []);

  return <>{children}</>;
}
