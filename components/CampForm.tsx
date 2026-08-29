'use client';

import { useState } from 'react';
import { LocationCapture } from './LocationCapture';
import { submitCamp } from '@/lib/camps';
import { useLang } from '@/lib/i18n/context';
import { ADMIN_FACILITY_KINDS } from '@/lib/facilities-kinds';
import type { LocationFix } from '@/lib/types';
import type { NewCampPayload } from '@/lib/db';

const KIND_LABEL_KEY: Record<string, string> = {
  health_camp: 'admin.kind.health_camp',
  refreshment_camp: 'admin.kind.refreshment_camp',
  rest_stop: 'admin.kind.rest_stop',
  night_stay: 'admin.kind.night_stay',
};

interface Props {
  onSubmitted: () => void;
}

export function CampForm({ onSubmitted }: Props) {
  const { t } = useLang();
  const [kind, setKind] = useState<(typeof ADMIN_FACILITY_KINDS)[number]>('health_camp');
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [capacity, setCapacity] = useState('');
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'queued' | 'error'; text: string } | null>(null);

  const canSubmit = name.trim().length > 0 && fix !== null && !submitting;

  async function handleSubmit() {
    if (!fix) return;
    setSubmitting(true);
    setMessage(null);

    const payload: NewCampPayload = {
      kind,
      name: name.trim(),
      lat: fix.lat,
      lng: fix.lng,
      fixAccuracyM: fix.accuracy,
      contactPhone: contactPhone.trim() || undefined,
      capacity: capacity ? Number(capacity) : undefined,
    };

    const result = await submitCamp(payload);
    setSubmitting(false);

    if (result.status === 'saved') {
      setMessage({ kind: 'ok', text: t('admin.saved') });
      setName('');
      setContactPhone('');
      setCapacity('');
      setFix(null);
      onSubmitted();
    } else if (result.status === 'queued') {
      setMessage({ kind: 'queued', text: t('admin.willSync') });
      setName('');
      setContactPhone('');
      setCapacity('');
      setFix(null);
      onSubmitted();
    } else {
      setMessage({ kind: 'error', text: result.message });
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-neutral-600">{t('admin.kindLabel')}</p>
        <div className="grid grid-cols-2 gap-2">
          {ADMIN_FACILITY_KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`tap-target rounded-xl border text-sm font-semibold ${
                kind === k
                  ? 'border-saffron-600 bg-saffron-50 text-saffron-700'
                  : 'border-neutral-200 text-neutral-600'
              }`}
            >
              {t(KIND_LABEL_KEY[k])}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-medium text-neutral-600">{t('admin.nameLabel')}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('admin.namePlaceholder')}
          className="tap-target mt-1 w-full rounded-xl border border-neutral-300 px-3"
        />

        <label className="mt-4 block text-sm font-medium text-neutral-600">{t('admin.phoneLabel')}</label>
        <input
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="+91…"
          type="tel"
          className="tap-target mt-1 w-full rounded-xl border border-neutral-300 px-3"
        />

        <label className="mt-4 block text-sm font-medium text-neutral-600">{t('admin.capacityLabel')}</label>
        <input
          value={capacity}
          onChange={(e) => setCapacity(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder={t('admin.capacityPlaceholder')}
          inputMode="numeric"
          className="tap-target mt-1 w-full rounded-xl border border-neutral-300 px-3"
        />
      </div>

      <LocationCapture onCaptured={setFix} />

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.kind === 'ok'
              ? 'bg-green-100 text-green-800'
              : message.kind === 'queued'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="tap-target w-full rounded-xl bg-saffron-600 font-bold text-white disabled:opacity-40"
      >
        {submitting ? t('common.loading') : t('admin.submit')}
      </button>
    </div>
  );
}
