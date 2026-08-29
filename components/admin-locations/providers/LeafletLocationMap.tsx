'use client';

/**
 * Leaflet implementation of the LocationMap contract.
 *
 * ============================================================
 * THIS IS THE ONLY FILE THAT KNOWS ABOUT LEAFLET.
 * ============================================================
 *
 * To move to Google Maps / Mapbox / MapLibre, write a new file exporting a
 * component with the identical LocationMapProps signature and change the one
 * dynamic import in ../LocationMap.tsx. Nothing else in the module — not the
 * form, not the list, not the hook — imports a map library.
 */

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';
import { categoryOrFallback } from '@/lib/admin-locations/categories';
import type { LocationMapProps } from '../LocationMap';

/**
 * Marker built from a category's own icon and colour, rather than Leaflet's
 * default PNG. Also sidesteps the well-known bundler issue where Leaflet's
 * default marker images 404 under webpack.
 */
function markerIcon(category: string, dimmed: boolean, selected: boolean) {
  const def = categoryOrFallback(category);
  const size = selected ? 38 : 30;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${def.color};
      opacity:${dimmed ? 0.45 : 1};
      border:${selected ? '4px solid #1e293b' : '3px solid #fff'};
      box-shadow:0 1px 5px rgba(0,0,0,.45);
      display:flex;align-items:center;justify-content:center;
      font-size:${selected ? 17 : 14}px;
    ">${def.icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Bridges Leaflet's imperative click events into the React prop. */
function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Recentres only when the caller passes a new `center`, never on every
 * render — otherwise the map would fight the admin for control of the
 * viewport every time any parent state changed.
 */
function Recenter({ center, zoom }: { center?: LatLngTuple; zoom?: number }) {
  const map = useMap();
  const lastKey = useRef<string>('');

  useEffect(() => {
    if (!center) return;
    const key = `${center[0].toFixed(6)},${center[1].toFixed(6)},${zoom ?? ''}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);

  return null;
}

/** Fits all markers in view once, on first load, when no center is given. */
function FitAll({ points, enabled }: { points: LatLngTuple[]; enabled: boolean }) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (!enabled || done.current || points.length === 0) return;
    done.current = true;
    if (points.length === 1) map.setView(points[0]!, 13);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }, [points, enabled, map]);

  return null;
}

export default function LeafletLocationMap({
  locations,
  selectedId,
  draftPosition,
  draftCategory = 'other',
  onMapClick,
  onMarkerDrag,
  onMarkerClick,
  center,
  zoom,
  height = 400,
  className,
  fitToMarkers = true,
  tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}: LocationMapProps) {
  const points = useMemo<LatLngTuple[]>(
    () => locations.map((l) => [l.latitude, l.longitude] as LatLngTuple),
    [locations],
  );

  const draft: LatLngTuple | null = draftPosition
    ? [draftPosition.latitude, draftPosition.longitude]
    : null;

  const initialCenter: LatLngTuple =
    (center as LatLngTuple | undefined) ?? draft ?? points[0] ?? [18.5204, 73.8567];

  return (
    <div
      className={className ?? 'overflow-hidden rounded-lg border border-gray-200'}
      style={{ height }}
    >
      <MapContainer
        center={initialCenter}
        zoom={zoom ?? 11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer url={tileUrl} attribution={attribution} maxZoom={19} />

        <ClickHandler onMapClick={onMapClick} />
        {center && <Recenter center={center as LatLngTuple} zoom={zoom} />}
        <FitAll points={points} enabled={fitToMarkers && !center && !draft} />

        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={markerIcon(loc.category, loc.status === 'inactive', loc.id === selectedId)}
            eventHandlers={{ click: () => onMarkerClick?.(loc.id) }}
          >
            <Popup>
              <strong>{loc.name}</strong>
              <br />
              {categoryOrFallback(loc.category).label}
              {loc.status === 'inactive' && (
                <>
                  <br />
                  <em>Inactive — hidden from users</em>
                </>
              )}
              {loc.address && (
                <>
                  <br />
                  {loc.address}
                </>
              )}
              {loc.contactNumber && (
                <>
                  <br />
                  {loc.contactNumber}
                </>
              )}
            </Popup>
          </Marker>
        ))}

        {/* The pin being placed or edited: draggable, and drawn on top. */}
        {draft && (
          <Marker
            position={draft}
            draggable
            icon={markerIcon(draftCategory, false, true)}
            zIndexOffset={1000}
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = (e.target as L.Marker).getLatLng();
                onMarkerDrag?.(lat, lng);
              },
            }}
          >
            <Popup>Drag to adjust, or click elsewhere on the map</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
