'use client';

/**
 * Reusable map. Provider-agnostic public surface.
 *
 * This file defines the contract and nothing else — no map library is
 * imported here. The implementation is loaded with next/dynamic and
 * `ssr: false`, which is required rather than stylistic: Leaflet touches
 * `window` at import time and will crash a server render.
 *
 * Swapping map providers means writing one new file against
 * LocationMapProps and changing the import below.
 */

import dynamic from 'next/dynamic';
import type { AdminLocation, LocationCategory } from '@/lib/admin-locations/types';

export interface LocationMapProps {
  /** Markers to draw. Always supplied by the caller — never fetched here. */
  locations: AdminLocation[];
  /** Highlighted marker, drawn larger with a dark ring. */
  selectedId?: string | null;
  /** The pin currently being placed or edited. Draggable. */
  draftPosition?: { latitude: number; longitude: number } | null;
  /** Category of the draft pin, so it previews with the right icon/colour. */
  draftCategory?: LocationCategory;
  /** Fires on any click on the map surface — used to set coordinates. */
  onMapClick?: (latitude: number, longitude: number) => void;
  /** Fires when the draft pin is dragged to a new position. */
  onMarkerDrag?: (latitude: number, longitude: number) => void;
  onMarkerClick?: (id: string) => void;
  /** Explicit [lat, lng] centre. Omit to let the map fit its markers. */
  center?: [number, number];
  zoom?: number;
  /** CSS height in px. Default 400. */
  height?: number;
  /** Overrides the default wrapper classes entirely. */
  className?: string;
  /** Fit the viewport to all markers on first load. Default true. */
  fitToMarkers?: boolean;
  /** Swap the basemap without touching the provider file. */
  tileUrl?: string;
  attribution?: string;
}

const Impl = dynamic(() => import('./providers/LeafletLocationMap'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400"
      style={{ height: 400 }}
    >
      Loading map…
    </div>
  ),
});

export function LocationMap(props: LocationMapProps) {
  return <Impl {...props} />;
}
