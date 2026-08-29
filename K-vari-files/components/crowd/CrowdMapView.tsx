'use client';

/**
 * The 2D room map: one colored polygon per zone (occupancy → LOW/MODERATE/
 * HIGH/CRITICAL, straight from the Python service — that occupancy level IS
 * the hazard signal, there's no separate anomaly detector), one dot per
 * camera at the corner it covers. Plain inline SVG — four rectangles and
 * four dots don't need a charting library.
 */

import type { CrowdCamera, CrowdMap, CrowdZone, Point } from '@/lib/crowd/types';
import { levelColor } from './LevelBadge';

function centroid(points: Point[]): Point {
  const x = points.reduce((sum, [px]) => sum + px, 0) / points.length;
  const y = points.reduce((sum, [, py]) => sum + py, 0) / points.length;
  return [x, y];
}

function Zone({ zone }: { zone: CrowdZone }) {
  const [cx, cy] = centroid(zone.polygon);
  const color = levelColor(zone.level);
  return (
    <g>
      <polygon
        points={zone.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
        fill={color}
        fillOpacity={0.28}
        stroke={color}
        strokeWidth={2.5}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={18} fontWeight={700} fill="#2b2019">
        {zone.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={14} fill="#5c5048">
        {zone.people_count ?? 0} / {zone.capacity}
      </text>
    </g>
  );
}

function CameraDot({ camera }: { camera: CrowdCamera }) {
  const [cx, cy] = centroid(camera.map_quad);
  return (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={11} fill={camera.online ? '#1F9D55' : '#9CA3AF'} stroke="#fff" strokeWidth={2} />
      <title>
        {camera.location} — {camera.online ? `${(camera.fps ?? 0).toFixed(1)} fps` : 'offline'}
      </title>
    </g>
  );
}

export function CrowdMapView({ map }: { map: CrowdMap }) {
  return (
    <svg
      viewBox={`0 0 ${map.width} ${map.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', background: '#FAF6F0', borderRadius: 12, border: '1px solid #E5DED4' }}
    >
      {map.zones.map((z) => (
        <Zone key={z.zone_id} zone={z} />
      ))}
      {map.cameras.map((c) => (
        <CameraDot key={c.camera_id} camera={c} />
      ))}
    </svg>
  );
}
