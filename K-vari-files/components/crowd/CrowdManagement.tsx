'use client';

/**
 * Drop-in root for the Crowd Congestion admin page: a live 2D room map plus
 * per-camera thumbnails, so an admin can see at a glance which corner of the
 * room needs volunteers.
 */

import { useCrowdMap } from '@/lib/crowd/useCrowdMap';
import { CrowdMapView } from './CrowdMapView';
import { CameraThumbnailGrid } from './CameraThumbnailGrid';
import { LevelBadge } from './LevelBadge';

export function CrowdManagement() {
  const { map, loading, error } = useCrowdMap();

  if (loading && !map) {
    return <div style={{ padding: 32, textAlign: 'center', color: '#8b8378' }}>Loading crowd map…</div>;
  }

  if (error && !map) {
    return (
      <div style={{ padding: 24, border: '1px dashed #E5DED4', borderRadius: 12, textAlign: 'center', color: '#8b8378' }}>
        {error}
        <div style={{ marginTop: 6, fontSize: 12.5 }}>
          Start the crowd congestion service (uvicorn on port 8200) and refresh.
        </div>
      </div>
    );
  }

  if (!map) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {map.zones.map((z) => (
          <div
            key={z.zone_id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E5DED4', borderRadius: 999, padding: '4px 12px', fontSize: 13 }}
          >
            <span style={{ fontWeight: 600 }}>{z.name}</span>
            <span style={{ color: '#8b8378' }}>{z.people_count ?? 0}/{z.capacity}</span>
            <LevelBadge level={z.level} />
          </div>
        ))}
      </div>

      <CrowdMapView map={map} />

      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Camera Feeds</h3>
        <CameraThumbnailGrid cameras={map.cameras} />
      </div>
    </div>
  );
}
