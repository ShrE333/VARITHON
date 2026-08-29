'use client';

/**
 * Super Admin — Crowd Congestion.
 *
 * Proxies to the varimitra_crowd_v1 FastAPI service (YOLO11n + ByteTrack)
 * running locally on this machine's GPU. See lib/crowd/* and
 * app/api/v1/crowd/*.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/portal/AdminShell';
import { CrowdManagement } from '@/components/crowd';

export default function SuperAdminCrowdPage() {
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
        active="crowd"
        title="Crowd Congestion"
        subtitle="Super Admin · Live Room Occupancy & Volunteer Deployment"
      >
        <div className="locations-panel">
          <div className="locations-intro">
            <h2>Room Congestion Map</h2>
            <p>
              Each camera covers one corner of the room. Zone color reflects live occupancy —
              deploy volunteers to HIGH or CRITICAL zones first.
            </p>
          </div>
          <div className="wari-scope">
            <CrowdManagement />
          </div>
        </div>
      </AdminShell>
    </div>
  );
}
