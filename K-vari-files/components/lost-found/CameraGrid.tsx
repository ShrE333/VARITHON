'use client';

/**
 * MJPEG multipart "just works" as a plain <img src>, the same way browsers
 * have handled Motion-JPEG webcams for decades — no canvas or manual
 * chunk-parsing needed. Cameras reported offline don't even mount the <img>,
 * to avoid holding open a connection to a stream with nothing to serve.
 */

import type { LostFoundCamera } from '@/lib/lost-found/types';
import { cameraStreamUrl } from '@/lib/lost-found/service';

export function CameraGrid({ cameras }: { cameras: LostFoundCamera[] }) {
  if (cameras.length === 0) {
    return <div className="rounded-md border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">No cameras configured.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cameras.map((cam) => (
        <div key={cam.camera_id} className="overflow-hidden rounded-lg border border-gray-200 bg-black">
          <div className="relative aspect-[4/3] bg-gray-900">
            {cam.online ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cameraStreamUrl(cam.camera_id)}
                alt={cam.camera_location}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-400">Camera offline</div>
            )}
          </div>
          <div className="flex justify-between bg-gray-900 px-2.5 py-1.5 text-xs text-gray-100">
            <span>{cam.camera_location}</span>
            <span>
              {cam.online
                ? `${(cam.fps ?? 0).toFixed(1)} fps · ${cam.faces ?? 0} faces · ${cam.matched_faces ?? 0} matched`
                : 'offline'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
