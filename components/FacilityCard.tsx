'use client';

import { formatDistance, formatEta } from '@/lib/chainage';
import { useLang } from '@/lib/i18n/context';
import type { NearestResult } from '@/lib/types';

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  full: 'bg-amber-100 text-amber-800',
  closed: 'bg-neutral-200 text-neutral-600',
};

interface Props {
  facility: NearestResult;
  onSelect: () => void;
}

export function FacilityCard({ facility, onSelect }: Props) {
  const { t } = useLang();

  return (
    <button
      onClick={onSelect}
      className="tap-target w-full rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm active:bg-neutral-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-neutral-800">{facility.name}</p>
          <p className="mt-1 text-sm text-neutral-500">
            {formatDistance(facility.totalWalkKm)} · 🚶 {formatEta(facility.totalWalkKm)}
            {!facility.isAhead && ` · ${t('nearby.behind')}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[facility.status] ?? ''}`}
        >
          {t(`nearby.status.${facility.status}`)}
        </span>
      </div>

      {facility.contactPhone && (
        <a
          href={`tel:${facility.contactPhone}`}
          onClick={(e) => e.stopPropagation()}
          className="tap-target mt-3 flex items-center justify-center gap-2 rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-700"
        >
          📞 {facility.contactPhone}
        </a>
      )}
    </button>
  );
}
