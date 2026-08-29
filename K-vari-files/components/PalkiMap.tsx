'use client';

/**
 * Map view for the Palki screen. Loaded via next/dynamic with ssr:false, so
 * Leaflet never enters the server bundle or the home screen's payload.
 *
 * What is drawn depends on how much we are willing to claim — see
 * lib/palki/client.ts. Past three hours there is no marker at all, only a
 * highlighted stretch of road.
 */

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';
import { RouteGeometry } from '@/lib/palki/geometry';
import type { PalkiView } from '@/lib/palki/client';
import { useLang } from '@/lib/i18n/context';

const palkiIcon = (solid: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:9999px;
      background:${solid ? '#ea580c' : 'rgba(234,88,12,0.25)'};
      border:${solid ? '3px solid #fff' : '3px dashed #ea580c'};
      box-shadow:0 1px 5px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;font-size:13px;
    ">🛕</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

const youIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;
    background:#2563eb;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function Recenter({ center, zoom }: { center: LatLngTuple | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface Props {
  coordinates: [number, number][];
  view: PalkiView;
  /** The pilgrim's own position, if they have granted location. */
  you: { lat: number; lng: number } | null;
}

export function PalkiMap({ coordinates, view, you, height = '100%' }: Props & { height?: string | number }) {
  const { t } = useLang();
  const geometry = useMemo(() => new RouteGeometry(coordinates), [coordinates]);

  const routeLatLngs: LatLngTuple[] = useMemo(
    () => coordinates.map(([lng, lat]) => [lat, lng] as LatLngTuple),
    [coordinates],
  );

  const palkiPos: LatLngTuple | null =
    view.sKm !== null && view.freshness !== 'segment' && view.freshness !== 'expired'
      ? (() => {
          const p = geometry.positionAt(view.sKm);
          return [p.lat, p.lng] as LatLngTuple;
        })()
      : null;

  // In the 3-8h band we draw the uncertainty stretch instead of a point.
  const segmentLatLngs: LatLngTuple[] | null =
    view.segment !== null ? geometry.sliceLatLngs(view.segment.fromKm, view.segment.toKm) : null;

  const center = palkiPos ?? (segmentLatLngs ? segmentLatLngs[Math.floor(segmentLatLngs.length / 2)]! : null);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-neutral-200 w-full h-full"
      style={{ height }}
    >
      <MapContainer
        center={center ?? [18.2, 74.6]}
        zoom={center ? 12 : 8}
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

        {segmentLatLngs && (
          <Polyline
            positions={segmentLatLngs}
            pathOptions={{ color: '#ea580c', weight: 8, opacity: 0.55 }}
          />
        )}

        {palkiPos && view.freshness !== 'live' && (
          // The uncertainty ring is drawn at the real sigma, in metres, so it
          // shrinks and grows with the model's actual confidence.
          <Circle
            center={palkiPos}
            radius={view.sigmaKm * 1000}
            pathOptions={{ color: '#ea580c', weight: 1, dashArray: '5 5', fillOpacity: 0.08 }}
          />
        )}

        {palkiPos && (
          <Marker position={palkiPos} icon={palkiIcon(view.freshness === 'live')}>
            <Popup>
              {view.freshness === 'live' ? t('palki.live') : t('palki.estimated')}
              <br />± {view.sigmaKm.toFixed(1)} km
            </Popup>
          </Marker>
        )}

        {you && (
          <Marker position={[you.lat, you.lng]} icon={youIcon}>
            <Popup>{t('palki.privacy')}</Popup>
          </Marker>
        )}

        <Recenter center={center} zoom={center ? 12 : 8} />
      </MapContainer>
    </div>
  );
}
