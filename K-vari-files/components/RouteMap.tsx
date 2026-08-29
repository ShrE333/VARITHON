'use client';

/**
 * Leaflet map for M2. Loaded only via next/dynamic with ssr:false — Leaflet
 * touches `window` at import time, and keeping it out of the server bundle
 * (and out of M1's home-screen bundle) is what keeps the initial route light.
 *
 * The route polyline and the Pandharpur marker come straight from
 * RouteIndex.bundle — coordinates are [lng, lat] there (GeoJSON order) and
 * have to be flipped to Leaflet's [lat, lng] order.
 */

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L, { type LatLngBoundsExpression, type LatLngTuple } from 'leaflet';
import type { RouteIndex } from '@/lib/chainage';
import type { LocationFix, RoutePosition } from '@/lib/types';
import { useLang } from '@/lib/i18n/context';

const FOLLOW_ZOOM = 15;

function dotIcon(color: string, size: number, pulse = false) {
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block; width:${size}px; height:${size}px; border-radius:9999px;
      background:${color}; border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,.4);
      ${pulse ? 'animation: wari-pulse 1.8s ease-out infinite;' : ''}
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const templeIcon = L.divIcon({
  className: '',
  html: `<div style="
    display:flex; align-items:center; justify-content:center;
    width:32px; height:32px; border-radius:9999px; background:#ea580c;
    border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,.4); font-size:16px;
  ">🛕</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface FollowControllerProps {
  fix: LocationFix | null;
  autoFollow: boolean;
  onManualPan: () => void;
}

/** Lives inside MapContainer so it can use react-leaflet's map context. */
function FollowController({ fix, autoFollow, onManualPan }: FollowControllerProps) {
  const map = useMap();

  // 'dragstart' only fires for user-initiated mouse/touch panning, never for
  // this component's own map.setView() calls, so it's a clean signal that
  // the pilgrim wants to look elsewhere and auto-follow should back off.
  useMapEvents({ dragstart: onManualPan });

  useEffect(() => {
    if (autoFollow && fix) {
      map.setView([fix.lat, fix.lng], Math.max(map.getZoom(), FOLLOW_ZOOM), { animate: true });
    }
  }, [fix, autoFollow, map]);

  return null;
}

interface Props {
  route: RouteIndex;
  fix: LocationFix | null;
  routePos: RoutePosition | null;
  /** Map height in px. The home glance wants a shorter map than /route does. */
  height?: number;
}

export function RouteMap({ route, fix, routePos, height = 420 }: Props) {
  const { t } = useLang();
  const [autoFollow, setAutoFollow] = useState(true);
  const initialBoundsRef = useRef<LatLngBoundsExpression>(
    route.bundle.coordinates.map(([lng, lat]) => [lat, lng]) as LatLngTuple[],
  );

  const routeLatLngs: LatLngTuple[] = route.bundle.coordinates.map(([lng, lat]) => [lat, lng]);
  const dest: LatLngTuple = [route.bundle.destination.lat, route.bundle.destination.lng];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-neutral-200" style={{ height }}>
      <style>{`
        @keyframes wari-pulse {
          0% { box-shadow: 0 0 0 0 rgba(234,88,12,.5); }
          100% { box-shadow: 0 0 0 16px rgba(234,88,12,0); }
        }
      `}</style>

      <MapContainer
        bounds={initialBoundsRef.current}
        boundsOptions={{ padding: [24, 24] }}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
          minZoom={7}
        />

        <Polyline positions={routeLatLngs} pathOptions={{ color: '#ea580c', weight: 4, opacity: 0.85 }} />

        <Marker position={dest} icon={templeIcon}>
          <Popup>{t('home.destination')}</Popup>
        </Marker>

        {fix && (
          <Marker position={[fix.lat, fix.lng]} icon={dotIcon('#2563eb', 18, true)}>
            <Popup>
              ± {Math.round(fix.accuracy)} m
              {routePos && !routePos.onRoute && (
                <>
                  <br />
                  {t('home.offRoute')}
                </>
              )}
            </Popup>
          </Marker>
        )}

        {fix && routePos && !routePos.onRoute && (
          <Polyline
            positions={[
              [fix.lat, fix.lng],
              [routePos.snapped.lat, routePos.snapped.lng],
            ]}
            pathOptions={{ color: '#b45309', weight: 2, dashArray: '6 6' }}
          />
        )}

        <FollowController fix={fix} autoFollow={autoFollow} onManualPan={() => setAutoFollow(false)} />
      </MapContainer>

      <button
        onClick={() => setAutoFollow(true)}
        className={`absolute bottom-3 right-3 z-[1000] tap-target px-4 rounded-full font-semibold text-sm shadow-md ${
          autoFollow ? 'bg-saffron-600 text-white' : 'bg-white text-neutral-700 border border-neutral-300'
        }`}
      >
        📍 {autoFollow ? t('map.following') : t('map.follow')}
      </button>
    </div>
  );
}
