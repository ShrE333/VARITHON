'use client';

/**
 * Single source of truth for congestion-level color, reusing the app's own
 * design tokens (styles/portal/varimitra.css --green/--amber/--orange/--red)
 * rather than inventing a new palette.
 */

import type { CongestionLevel } from '@/lib/crowd/types';

const LEVEL_COLOR: Record<CongestionLevel, string> = {
  LOW: 'var(--green)',
  MODERATE: 'var(--amber)',
  HIGH: 'var(--orange)',
  CRITICAL: 'var(--red)',
};

export function levelColor(level?: CongestionLevel | string): string {
  return LEVEL_COLOR[(level as CongestionLevel) ?? 'LOW'] ?? LEVEL_COLOR.LOW;
}

export function LevelBadge({ level }: { level?: CongestionLevel | string }) {
  const color = levelColor(level);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11.5,
        fontWeight: 700,
        color: '#fff',
        background: color,
        borderRadius: 999,
        padding: '2px 10px',
      }}
    >
      {level ?? 'LOW'}
    </span>
  );
}
