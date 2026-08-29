'use client';

import { useOnline } from '@/lib/use-online';
import { useApp } from '@/lib/app-context';
import { useLang } from '@/lib/i18n/context';

function formatAge(ms: number, t: ReturnType<typeof useLang>['t']): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return t('offline.justNow');
  if (minutes < 60) return t('offline.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('offline.hoursAgo', { n: hours });
  return t('offline.daysAgo', { n: Math.floor(hours / 24) });
}

export function OfflineBanner() {
  const online = useOnline();
  const { cachedAt } = useApp();
  const { t } = useLang();

  if (online) return null;

  return (
    <div className="bg-neutral-800 text-white text-sm px-4 py-2 flex items-center justify-between gap-2">
      <span className="font-medium">📡 {t('offline.banner')}</span>
      {cachedAt !== null && (
        <span className="text-neutral-300">{t('offline.cacheAge', { age: formatAge(Date.now() - cachedAt, t) })}</span>
      )}
    </div>
  );
}
