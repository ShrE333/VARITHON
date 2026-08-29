'use client';

/**
 * TEST HARNESS — safe to delete after handoff.
 *
 * Exists only so the module can be exercised in this repo before it is
 * handed over. It is NOT an admin panel: it renders nothing but a heading
 * and <LocationManagement />, which is the point — it demonstrates that the
 * module needs no surrounding layout, providers, or context to work.
 *
 * Deliberately placed OUTSIDE app/admin/ so it does not inherit that
 * section's max-w-md mobile layout, which would squash the table and map.
 *
 * The teammate integrating this should render <LocationManagement /> inside
 * their own panel and delete this file.
 */

import { LocationManagement } from '@/components/admin-locations';

export default function AdminLocationsTestPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-1 text-xl font-bold text-gray-800">Location Management</h1>
      <p className="mb-5 text-sm text-gray-500">
        Test harness for the admin locations module — not part of the final admin panel.
      </p>
      <LocationManagement />
    </div>
  );
}
