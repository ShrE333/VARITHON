'use client';

import { referenceImageUrl, evidenceImageUrl } from '@/lib/lost-found/service';

export function ReferenceEvidencePreview({ caseId, alertId }: { caseId: string; alertId: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="mb-1 text-xs font-medium text-gray-500">Reference photo</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={referenceImageUrl(caseId)}
          alt="Reference"
          className="aspect-square w-full rounded-md border border-gray-200 object-cover"
        />
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-gray-500">CCTV evidence</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={evidenceImageUrl(alertId)}
          alt="Evidence"
          className="aspect-square w-full rounded-md border border-gray-200 object-cover"
        />
      </div>
    </div>
  );
}
