'use client';

/**
 * Demo map: simulated actual vs the model's estimate, plus the forecast cone.
 *
 * When the red and blue markers sit on top of each other, the model is
 * working — and that reads without any explanation, which is the whole
 * reason this panel exists.
 */

import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Circle, useMap } from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';
import { useEffect } from 'react';
import { RouteGeometry } from '@/lib/palki/geometry';
import type { ForecastRow } from '@/lib/palki/types';

const dot = (color: string, size: number) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};border:2px solid white;box-shadow:0 1px 5px rgba(0,0,0,.5)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

function Follow({ center }: { center: LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, Math.max(map.getZoom(), 12));
  }, [center, map]);
  return null;
}

interface Props {
  coordinates: [number, number][];
  actualSKm: number | null;
  modelSKm: number | null;
  forecast: ForecastRow[];
}

export function DemoMap({ coordinates, actualSKm, modelSKm, forecast }: Props) {
  const geometry = useMemo(() => new RouteGeometry(coordinates), [coordinates]);
  const routeLatLngs = useMemo(
    () => coordinates.map(([lng, lat]) => [lat, lng] as LatLngTuple),
    [coordinates],
  );

  const actual: LatLngTuple | null =
    actualSKm !== null ? (([geometry.positionAt(actualSKm).lat, geometry.positionAt(actualSKm).lng]) as LatLngTuple) : null;
  const model: LatLngTuple | null =
    modelSKm !== null ? (([geometry.positionAt(modelSKm).lat, geometry.positionAt(modelSKm).lng]) as LatLngTuple) : null;

  // The cone: the stretch of road the forecast covers, drawn thicker as
  // uncertainty grows. Cheap to render and reads as "somewhere in here".
  const coneLatLngs = useMemo(() => {
    if (forecast.length === 0 || modelSKm === null) return null;
    const last = forecast[forecast.length - 1]!;
    return geometry.sliceLatLngs(modelSKm, last.sKm);
  }, [forecast, modelSKm, geometry]);

  const lastSigma = forecast.length ? forecast[forecast.length - 1]!.sigmaKm : 0;

  return (
    <div className="overflow-hidden rounded-xl" style={{ height: 360 }}>
      <MapContainer
        center={actual ?? model ?? [18.2, 74.6]}
        zoom={actual || model ? 12 : 8}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        <Polyline positions={routeLatLngs} pathOptions={{ color: '#d4d4d4', weight: 3 }} />

        {coneLatLngs && (
          <Polyline
            positions={coneLatLngs}
            pathOptions={{ color: '#60a5fa', weight: 10, opacity: 0.45 }}
          />
        )}

        {model && lastSigma > 0 && (
          <Circle
            center={model}
            radius={lastSigma * 1000}
            pathOptions={{ color: '#2563eb', weight: 1, dashArray: '4 4', fillOpacity: 0.06 }}
          />
        )}

        {model && <Marker position={model} icon={dot('#2563eb', 18)} />}
        {actual && <Marker position={actual} icon={dot('#dc2626', 14)} />}

        <Follow center={actual ?? model} />
      </MapContainer>
    </div>
  );
}
