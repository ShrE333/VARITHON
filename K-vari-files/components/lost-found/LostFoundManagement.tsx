'use client';

/**
 * Drop-in root for the Lost & Found admin page. Owns the single
 * useLostFound() poll and hands data/mutations down to four tabs.
 */

import { useState } from 'react';
import { useLostFound } from '@/lib/lost-found/useLostFound';
import { CaseList } from './CaseList';
import { CaseForm } from './CaseForm';
import { CameraGrid } from './CameraGrid';
import { AlertsFeed } from './AlertsFeed';
import { SightingsHistory } from './SightingsHistory';

type Tab = 'cases' | 'cameras' | 'alerts' | 'sightings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'cases', label: 'Cases' },
  { id: 'cameras', label: 'Cameras' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'sightings', label: 'Sightings' },
];

export function LostFoundManagement() {
  const { cases, alerts, cameras, loading, error, createCase, closeCase, confirmAlert, rejectAlert } =
    useLostFound();
  const [tab, setTab] = useState<Tab>('cases');

  const pendingCount = alerts.filter((a) => a.status === 'PENDING').length;

  if (loading && cases.length === 0 && alerts.length === 0 && cameras.length === 0) {
    return <div className="py-12 text-center text-sm text-gray-400">Loading Lost &amp; Found…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        {error}
        <div className="mt-1 text-xs text-gray-400">
          Start the Lost &amp; Found service (uvicorn on port 8000, Triton container running) and refresh.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
            {t.id === 'alerts' && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'cases' && (
        <div className="space-y-4">
          <CaseForm createCase={createCase} />
          <CaseList cases={cases} onClose={closeCase} />
        </div>
      )}
      {tab === 'cameras' && <CameraGrid cameras={cameras} />}
      {tab === 'alerts' && <AlertsFeed alerts={alerts} onConfirm={confirmAlert} onReject={rejectAlert} />}
      {tab === 'sightings' && <SightingsHistory cases={cases} />}
    </div>
  );
}
