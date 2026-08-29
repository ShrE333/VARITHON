'use client';

import { useState } from 'react';
import { useSightings } from '@/lib/lost-found/useLostFound';
import type { LostFoundCase } from '@/lib/lost-found/types';

export function SightingsHistory({ cases }: { cases: LostFoundCase[] }) {
  const [caseId, setCaseId] = useState<string>('');
  const { sightings, loading, error } = useSightings(caseId || undefined);

  return (
    <div className="space-y-3">
      <select
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={caseId}
        onChange={(e) => setCaseId(e.target.value)}
      >
        <option value="">All cases</option>
        {cases.map((c) => (
          <option key={c.case_id} value={c.case_id}>
            {c.name} ({c.case_id})
          </option>
        ))}
      </select>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
      ) : sightings.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
          No sightings.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Camera</th>
                <th className="px-3 py-2">Similarity</th>
                <th className="px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {sightings.map((s) => (
                <tr key={s.sighting_id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{s.name}</td>
                  <td className="px-3 py-2 text-gray-600">{s.camera_location}</td>
                  <td className="px-3 py-2 text-gray-600">{(s.similarity * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-gray-600">{new Date(s.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
