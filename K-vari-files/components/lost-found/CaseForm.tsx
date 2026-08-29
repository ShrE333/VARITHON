'use client';

/**
 * Create a missing-person case: one photo + name are required, the rest
 * optional. The Python service returns a flat {detail} string on a 400
 * (invalid image / no face found), not per-field errors, so this shows one
 * banner rather than field-level highlighting.
 */

import { useState, type FormEvent } from 'react';
import type { CreateCaseInput, LostFoundCase, ServiceResult } from '@/lib/lost-found/types';

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

export interface CaseFormProps {
  createCase: (input: CreateCaseInput) => Promise<ServiceResult<LostFoundCase>>;
  onCreated?: () => void;
}

export function CaseForm({ createCase, onCreated }: CaseFormProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!photo || !name.trim()) {
      setError('A photo and a name are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await createCase({
      photo,
      name: name.trim(),
      age: age.trim() || undefined,
      last_seen: lastSeen.trim() || undefined,
      reporter_contact: reporterContact.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPhoto(null);
    setName('');
    setAge('');
    setLastSeen('');
    setReporterContact('');
    onCreated?.();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800">New Missing Person Case</h3>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Photo (one clear face) *</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Name *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Age</label>
          <input className={inputCls} value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Last seen location</label>
        <input className={inputCls} value={lastSeen} onChange={(e) => setLastSeen(e.target.value)} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Reporter contact</label>
        <input className={inputCls} value={reporterContact} onChange={(e) => setReporterContact(e.target.value)} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Creating…' : 'Create Case'}
      </button>
    </form>
  );
}
