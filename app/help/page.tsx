'use client';

import { useLang } from '@/lib/i18n/context';

export default function HelpPage() {
  const { t } = useLang();
  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-6">
      <h1 className="text-lg font-bold text-neutral-800 mb-4">{t('nav.help')}</h1>
      <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center text-neutral-400">
        M3 — Medical / Food / Rest / Stay finder coming next.
      </div>
    </div>
  );
}
