'use client';

import { LangProvider } from '@/lib/i18n/context';
import { AppProvider } from '@/lib/app-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <AppProvider>{children}</AppProvider>
    </LangProvider>
  );
}
