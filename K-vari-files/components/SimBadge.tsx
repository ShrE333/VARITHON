'use client';

import { useApp } from '@/lib/app-context';
import { useLang } from '@/lib/i18n/context';

export function SimBadge() {
  const { simActive } = useApp();
  const { t } = useLang();

  if (!simActive) return null;

  return (
    <div className="bg-purple-600 text-white text-xs font-semibold text-center py-1">
      🧪 {t('sim.badge')}
    </div>
  );
}
