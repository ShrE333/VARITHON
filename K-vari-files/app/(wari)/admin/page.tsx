'use client';

/**
 * M4 — camp registration, no admin login (yet).
 *
 * "My camps" here means "submitted from this browser" — a Dexie/localStorage
 * concept, not a real account. Once admin login exists, this becomes a
 * server-side query scoped by owner_id instead; see lib/camps.ts and
 * db/schema.sql's already-built (but currently bypassed) owner-gated RLS.
 */

import { useCallback, useEffect, useState } from 'react';
import { CampForm } from '@/components/CampForm';
import { useLang } from '@/lib/i18n/context';
import { useOnline } from '@/lib/use-online';
import {
  flushPendingCamps,
  getLocalSubmissions,
  pendingCampCount,
  updateLocalSubmissionStatus,
  type MySubmission,
} from '@/lib/camps';

const STATUS_CYCLE: Record<string, string> = { open: 'full', full: 'closed', closed: 'open' };

export default function AdminHome() {
  const { t } = useLang();
  const online = useOnline();
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [pending, setPending] = useState(0);

  const refresh = useCallback(() => {
    setSubmissions(getLocalSubmissions());
    pendingCampCount().then(setPending);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Flush the offline queue on reconnect, and once on mount in case the app
  // was reopened already online with a queue left over from last time.
  useEffect(() => {
    if (!online) return;
    flushPendingCamps().then((n) => {
      if (n > 0) refresh();
    });
  }, [online, refresh]);

  async function toggleStatus(sub: MySubmission) {
    const next = STATUS_CYCLE[sub.status] ?? 'open';
    // Optimistic — this is a status toggle, not a submission; instant
    // feedback matters more here than handling the rare failure specially.
    updateLocalSubmissionStatus(sub.id, next as MySubmission['status']);
    refresh();
    try {
      await fetch(`/api/v1/facilities/${sub.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
    } catch {
      // Best-effort; the next successful toggle will correct any drift.
    }
  }

  return (
    <div className="space-y-4">
      {!online && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          ✈️ {t('admin.offline')}
        </div>
      )}
      {pending > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          ⏳ {t('admin.pendingSync', { n: pending })}
        </div>
      )}

      <h1 className="text-lg font-bold text-neutral-800">{t('admin.title')}</h1>

      <CampForm onSubmitted={refresh} />

      {submissions.length > 0 && (
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-bold text-neutral-500">{t('admin.mySubmissions')}</h2>
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3"
            >
              <span className="font-medium text-neutral-700">{sub.name}</span>
              <button
                onClick={() => toggleStatus(sub)}
                className="tap-target rounded-full bg-neutral-100 px-3 text-xs font-bold text-neutral-600"
              >
                {t(`nearby.status.${sub.status}`)} ↻
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
