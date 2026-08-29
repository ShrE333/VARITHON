'use client';

/**
 * Facility detail map: the pilgrim, the facility, and a straight line
 * between them — deliberately not a routed path. This app has no routing
 * API anywhere (offline-first is the whole design), so "distance" here
 * means the same arc-length-plus-offset arithmetic as everywhere else, not
 * a road-following line. The straight line is honest about that rather than
 * implying turn-by-turn directions it can't actually give.
 */

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';
import type { FacilityKind } from '@/lib/types';

const KIND_EMOJI: Record<FacilityKind, string> = {
  hospital: '🏥',
  phc: '🏥',
  pharmacy: '💊',
  health_camp: '⚕️',
  refreshment_camp: '🍲',
  rest_stop: '🪑',
  night_stay: '🏨',
  hotel: '🏨',
};

const facilityIcon = (kind: FacilityKind) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:9999px;
      background:#ea580c;border:3px solid #fff;
      box-shadow:0 1px 5px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;font-size:15px;
    ">${KIND_EMOJI[kind] ?? '📍'}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const youIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;
    background:#2563eb;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
  }, [points, map]);
  return null;
}

interface Props {
  /** Full route polyline, drawn faintly for context. */
  coordinates: [number, number][];
  you: { lat: number; lng: number } | null;
  facility: { lat: number; lng: number; name: string; kind: FacilityKind };
}

export function FacilityMap({ coordinates, you, facility }: Props) {
  const routeLatLngs: LatLngTuple[] = useMemo(
    () => coordinates.map(([lng, lat]) => [lat, lng] as LatLngTuple),
    [coordinates],
  );

  const facilityPos: LatLngTuple = [facility.lat, facility.lng];
  const youPos: LatLngTuple | null = you ? [you.lat, you.lng] : null;
  const bothPoints = youPos ? [youPos, facilityPos] : [facilityPos];

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200" style={{ height: 280 }}>
      <MapContainer
        center={facilityPos}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
          minZoom={7}
        />

        <Polyline positions={routeLatLngs} pathOptions={{ color: '#d4d4d4', weight: 3 }} />

        {youPos && (
          <Polyline
            positions={[youPos, facilityPos]}
            pathOptions={{ color: '#2563eb', weight: 3, dashArray: '6 6' }}
          />
        )}

        <Marker position={facilityPos} icon={facilityIcon(facility.kind)}>
          <Popup>{facility.name}</Popup>
        </Marker>

        {youPos && (
          <Marker position={youPos} icon={youIcon}>
            <Popup>You</Popup>
          </Marker>
        )}

        <FitBounds points={bothPoints} />
      </MapContainer>
    </div>
  );
}
