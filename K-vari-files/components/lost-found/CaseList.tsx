'use client';

import type { LostFoundCase } from '@/lib/lost-found/types';

export interface CaseListProps {
  cases: LostFoundCase[];
  onClose: (caseId: string) => void;
}

export function CaseList({ cases, onClose }: CaseListProps) {
  if (cases.length === 0) {
    return <div className="rounded-md border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">No cases yet.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Case ID</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Age</th>
            <th className="px-3 py-2">Last Seen</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.case_id} className="border-t border-gray-100">
              <td className="px-3 py-2 font-mono text-xs text-gray-500">{c.case_id}</td>
              <td className="px-3 py-2 font-medium text-gray-800">{c.name}</td>
              <td className="px-3 py-2 text-gray-600">{c.age ?? '—'}</td>
              <td className="px-3 py-2 text-gray-600">{c.last_seen ?? '—'}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    c.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {c.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                {c.status === 'ACTIVE' && (
                  <button
                    onClick={() => onClose(c.case_id)}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Close case
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
