/**
 * Three ways to mount the feature, smallest first.
 *
 * This file is documentation that happens to compile — it is not imported by
 * anything. Copy the pattern you need into your panel and delete the folder.
 */

import { useState } from 'react';
import {
  LocationManagement,
  LocationList,
  LocationForm,
  LocationMap,
  useLocations,
  configureLocationService,
} from '../src/admin-locations';

// ---------------------------------------------------------------------------
// 1. The whole feature, in one line.
//
// Renders no page chrome, no background, no fixed width — it fills whatever
// container you put it in, so your panel's layout stays in charge.
// ---------------------------------------------------------------------------

export function LocationsPage() {
  return (
    <YourAdminLayout title="Locations">
      <LocationManagement />
    </YourAdminLayout>
  );
}

// ---------------------------------------------------------------------------
// 2. Same, with the options you are most likely to want.
// ---------------------------------------------------------------------------

export function LocationsPageTuned() {
  return (
    <LocationManagement
      mapHeight={520}
      className="space-y-6"
      onChange={() => console.log('a location was created, updated or deleted')}
    />
  );
}

// ---------------------------------------------------------------------------
// 3. Compose the pieces yourself, if your panel wants its own layout.
//
// `useLocations` holds all the state and CRUD; the three components are
// presentational and never fetch anything on their own.
// ---------------------------------------------------------------------------

export function CustomLocationsScreen() {
  const { filtered, loading, error, filters, setFilters, create, remove } = useLocations();
  const [draft, setDraft] = useState<{ latitude: number; longitude: number } | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <LocationMap
        locations={filtered}
        draftPosition={draft}
        onMapClick={(latitude, longitude) => setDraft({ latitude, longitude })}
        height={500}
      />

      <LocationForm
        coordinates={draft}
        // Return the ServiceResult unchanged — that is what lets field errors
        // from the server render against the right inputs.
        onSubmit={create}
      />

      <div className="lg:col-span-2">
        <LocationList
          locations={filtered}
          loading={loading}
          error={error}
          filters={filters}
          onFiltersChange={setFilters}
          onDelete={(location) => remove(location.id)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Point the module at your backend. Call this ONCE, at app start —
//    before the first render, e.g. in main.tsx or a root layout.
//
// Only needed if your API is not at /api/v1/admin/locations, or if your
// panel authenticates with a session token instead of ADMIN_API_TOKEN.
// ---------------------------------------------------------------------------

export function configureOnce(session: { token: string }) {
  configureLocationService({
    baseUrl: '/api/admin/locations',
    // Called on every request, so a refreshed token is picked up.
    headers: () => ({ authorization: `Bearer ${session.token}` }),
  });
}

/** Stand-in for whatever your panel's shell component is called. */
function YourAdminLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h1>{title}</h1>
      {children}
    </section>
  );
}
