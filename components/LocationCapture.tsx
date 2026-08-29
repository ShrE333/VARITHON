'use client';

/**
 * Wraps sampleStablePosition() with the live progress UI the README
 * describes: "8 of 10 good fixes, best ±12 m". A single GPS fix routinely
 * lands a pin 40 m off — permanent error for a camp, unlike a moving
 * pilgrim's transient one — so this collects several and takes the median.
 */

import { useState } from 'react';
import { sampleStablePosition } from '@/lib/geolocation';
import { useLang } from '@/lib/i18n/context';
import type { LocationFix } from '@/lib/types';

interface Props {
  onCaptured: (fix: LocationFix) => void;
}

export function LocationCapture({ onCaptured }: Props) {
  const { t } = useLang();
  const [state, setState] = useState<'idle' | 'sampling' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ collected: 0, target: 10, best: Infinity });
  const [error, setError] = useState<string | null>(null);
  const [fix, setFix] = useState<LocationFix | null>(null);

  async function capture() {
    setState('sampling');
    setError(null);
    setProgress({ collected: 0, target: 10, best: Infinity });
    try {
      const result = await sampleStablePosition({
        onProgress: (collected, target, best) => setProgress({ collected, target, best }),
      });
      setFix(result);
      setState('done');
      onCaptured(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'location failed');
      setState('error');
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-neutral-600">{t('admin.location')}</p>

      {state === 'idle' && (
        <button
          onClick={capture}
          className="tap-target w-full rounded-xl bg-saffron-600 font-semibold text-white"
        >
          📍 {t('admin.captureLocation')}
        </button>
      )}

      {state === 'sampling' && (
        <div className="text-center">
          <p className="text-sm text-neutral-600">
            {t('admin.sampling', { n: progress.collected, target: progress.target })}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            {progress.best === Infinity
              ? t('admin.waitingSignal')
              : t('admin.bestAccuracy', { m: Math.round(progress.best) })}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full bg-saffron-500 transition-all"
              style={{ width: `${(progress.collected / progress.target) * 100}%` }}
            />
          </div>
        </div>
      )}

      {state === 'done' && fix && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-green-700">
            ✓ {t('admin.locationCaptured', { m: Math.round(fix.accuracy) })}
          </p>
          <button onClick={capture} className="text-xs font-semibold text-neutral-500 underline">
            {t('admin.retake')}
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={capture}
            className="tap-target mt-2 w-full rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-700"
          >
            {t('common.retry')}
          </button>
        </div>
      )}
    </div>
  );
}
