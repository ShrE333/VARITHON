'use client';

/**
 * The crowd service has no MJPEG stream endpoint (only a single latest-frame
 * JPEG), so each tile polls its frame URL on an interval with a
 * cache-busting query param — the upstream sets Cache-Control: no-store, but
 * bumping the URL itself avoids the browser coalescing identical in-flight
 * requests.
 */

import { useEffect, useState } from 'react';
import type { CrowdCamera } from '@/lib/crowd/types';
import { cameraFrameUrl } from '@/lib/crowd/service';

const POLL_MS = 800;

function Thumbnail({ camera }: { camera: CrowdCamera }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!camera.online) {
      setSrc(null);
      return;
    }
    const tick = () => setSrc(`${cameraFrameUrl(camera.camera_id)}?t=${Date.now()}`);
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [camera.camera_id, camera.online]);

  return (
    <div style={{ border: '1px solid #E5DED4', borderRadius: 10, overflow: 'hidden', background: '#111' }}>
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: '#1b1712' }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={camera.location} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b8378', fontSize: 12.5 }}>
            Camera offline
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', fontSize: 12, color: '#f4efe8', background: '#2b2019' }}>
        <span>{camera.location}</span>
        <span>{camera.online ? `${(camera.fps ?? 0).toFixed(1)} fps · ${camera.detected_people ?? 0} people` : 'offline'}</span>
      </div>
    </div>
  );
}

export function CameraThumbnailGrid({ cameras }: { cameras: CrowdCamera[] }) {
  if (cameras.length === 0) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#8b8378', fontSize: 13 }}>No cameras configured.</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      {cameras.map((c) => (
        <Thumbnail key={c.camera_id} camera={c} />
      ))}
    </div>
  );
}
