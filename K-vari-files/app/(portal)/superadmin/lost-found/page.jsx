'use client';

/**
 * Super Admin — Lost & Found (missing-person face recognition).
 *
 * Proxies to the varimitra_lost_person_v6 FastAPI service (Triton-backed
 * SCRFD/ArcFace) running locally on this machine's GPU. See
 * lib/lost-found/* and app/api/v1/lost-found/*.
 *
 * `wari-scope` re-applies the hand-styled portal CSS that Tailwind's global
 * preflight reset would otherwise flatten — same requirement as the
 * Location Management page this is modeled on.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/portal/AdminShell';
import { LostFoundManagement } from '@/components/lost-found';

export default function SuperAdminLostFoundPage() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('varimitra_user');
    if (!saved) {
      router.replace('/');
      return;
    }
    try {
      if (JSON.parse(saved).role !== 'admin') router.replace('/varimitra');
    } catch {
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="vm-admin">
      <AdminShell
        active="lost-found"
        title="Lost & Found"
        subtitle="Super Admin · Missing Person Face Recognition & Alerts"
      >
        <div className="locations-panel">
          <div className="locations-intro">
            <h2>Missing Person Cases</h2>
            <p>
              Enroll a missing person, review camera match alerts, and confirm or reject sightings
              before anyone is notified. Alerts are never auto-confirmed.
            </p>
          </div>
          <div className="wari-scope">
            <LostFoundManagement />
          </div>
        </div>
      </AdminShell>
    </div>
  );
}
