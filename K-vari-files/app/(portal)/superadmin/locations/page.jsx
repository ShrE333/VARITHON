'use client';

/**
 * Super Admin — Location Management.
 *
 * The drop-in from the Wari Saathi side (docs/07-admin-locations.md), mounted
 * inside the command dashboard's chrome. This is the write end of the same
 * `facilities` table the pilgrim SOS screen reads: a camp added here shows up
 * in /help's "nearest medical" search, which is the whole point of putting it
 * in the admin panel rather than keeping a second locations table.
 *
 * `wari-scope` on the panel is required, not cosmetic — Tailwind's preflight
 * is disabled globally so it cannot reach the hand-styled portal, and that
 * class is what re-applies it. Without it every border in the module's table
 * and form renders at zero width.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/portal/AdminShell';
import { LocationManagement } from '@/components/admin-locations';

export default function SuperAdminLocationsPage() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('varimitra_user');
    if (!saved) {
      router.replace('/');
      return;
    }
    try {
      if (JSON.parse(saved).role !== 'admin') router.replace('/');
    } catch {
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="vm-admin">
      <AdminShell
        active="locations"
        title="Location Management"
        subtitle="Super Admin · Camps, Medical Posts & Facilities on the Wari Route"
      >
        <div className="locations-panel">
          <div className="locations-intro">
            <h2>Route Locations</h2>
            <p>
              Add, edit and retire the medical posts, food seva points, rest shelters and stay
              options along the Wari route. Anything marked active here is what pilgrims see in
              the app&rsquo;s SOS and &ldquo;nearest help&rdquo; search.
            </p>
          </div>
          <div className="wari-scope">
            <LocationManagement mapHeight={460} />
          </div>
        </div>
      </AdminShell>
    </div>
  );
}
