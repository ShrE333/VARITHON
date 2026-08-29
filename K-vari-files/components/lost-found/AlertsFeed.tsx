'use client';

import { useState } from 'react';
import type { LostFoundAlert } from '@/lib/lost-found/types';
import { ReferenceEvidencePreview } from './ReferenceEvidencePreview';

export interface AlertsFeedProps {
  alerts: LostFoundAlert[];
  onConfirm: (alertId: number) => void;
  onReject: (alertId: number) => void;
}

const statusCls: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-200 text-gray-600',
};

export function AlertsFeed({ alerts, onConfirm, onReject }: AlertsFeedProps) {
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'CONFIRMED' | 'REJECTED'>('PENDING');
  const [expanded, setExpanded] = useState<number | null>(null);

  const visible = filter === 'all' ? alerts : alerts.filter((a) => a.status === filter);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['PENDING', 'CONFIRMED', 'REJECTED', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
          No alerts.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => (
            <div key={a.alert_id} className="rounded-lg border border-gray-200 p-3">
              <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() => setExpanded(expanded === a.alert_id ? null : a.alert_id)}
              >
                <div>
                  <div className="font-medium text-gray-800">
                    {a.name} <span className="font-mono text-xs text-gray-400">#{a.alert_id}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {a.camera_location} · {(a.similarity * 100).toFixed(1)}% match · {new Date(a.timestamp).toLocaleString()}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusCls[a.status]}`}>
                  {a.status}
                </span>
              </div>

              {expanded === a.alert_id && (
                <div className="mt-3 space-y-3">
                  <ReferenceEvidencePreview caseId={a.case_id} alertId={a.alert_id} />
                  {a.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onConfirm(a.alert_id)}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => onReject(a.alert_id)}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
