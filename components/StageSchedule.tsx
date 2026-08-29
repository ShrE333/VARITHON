'use client';

import type { RouteStage } from '@/lib/types';
import { useLang } from '@/lib/i18n/context';

/**
 * build_road_route.mjs writes Marathi place names alongside the English
 * ones. They're additive, so RouteStage stays as-is and this widens it
 * locally rather than editing the shared type.
 */
type LocalisedStage = RouteStage & { fromPlaceMr?: string; toPlaceMr?: string };

interface Props {
  stages: LocalisedStage[];
  currentStage: RouteStage | null;
  /** Stages from the pilgrim's position onward, inclusive — null when not located yet. */
  remainingCount: number | null;
}

export function StageSchedule({ stages, currentStage, remainingCount }: Props) {
  const { t, lang } = useLang();

  const placeNames = (s: LocalisedStage) =>
    lang === 'mr'
      ? { from: s.fromPlaceMr ?? s.fromPlace, to: s.toPlaceMr ?? s.toPlace }
      : { from: s.fromPlace, to: s.toPlace };

  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-neutral-800">{t('schedule.title')}</h2>
        {remainingCount !== null ? (
          <span className="text-xs font-semibold text-saffron-700 bg-saffron-50 rounded-full px-2 py-1">
            {t('schedule.daysRemaining', { n: remainingCount })}
          </span>
        ) : (
          <span className="text-xs text-neutral-400">{t('schedule.notLocated')}</span>
        )}
      </div>

      <ol className="space-y-1">
        {stages.map((stage) => {
          const isCurrent = currentStage?.dayNumber === stage.dayNumber;
          const { from, to } = placeNames(stage);
          return (
            <li
              key={stage.dayNumber}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                isCurrent ? 'bg-saffron-50 border border-saffron-300' : 'border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 ${
                    isCurrent ? 'bg-saffron-600 text-white' : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {stage.dayNumber}
                </span>
                <span className={isCurrent ? 'font-semibold text-saffron-800' : 'text-neutral-700'}>
                  {from} → {to}
                </span>
                {isCurrent && (
                  <span className="text-[10px] font-bold text-saffron-600 uppercase">{t('schedule.today')}</span>
                )}
              </div>
              <span className="text-neutral-400 text-xs shrink-0 ml-2">
                {(stage.endKm - stage.startKm).toFixed(0)} km
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
