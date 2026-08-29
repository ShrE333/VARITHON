'use client';

/**
 * Prediction error over time, one line per horizon.
 *
 * Hand-drawn SVG rather than a charting library — the brief forbids new heavy
 * dependencies, and this needs four polylines and an axis.
 *
 * It deliberately does NOT smooth or clip the spike when a disruption hits.
 * A model that visibly gets it wrong and then visibly recovers is far more
 * convincing than one that was apparently never tested, and hiding the spike
 * would be exactly the kind of dishonesty the rest of this feature is built
 * to avoid.
 */

export interface ErrorPoint {
  issuedAt: string;
  horizonMin: number;
  errorKm: number;
}

const HORIZON_COLORS: Record<number, string> = {
  60: '#2563eb',
  120: '#7c3aed',
  180: '#ea580c',
  300: '#dc2626',
};

interface Props {
  series: ErrorPoint[];
  /** Optional markers, e.g. "unscheduled 45-min halt injected". */
  annotations?: { at: string; label: string }[];
  height?: number;
}

export function ErrorChart({ series, annotations = [], height = 200 }: Props) {
  if (series.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-400"
        style={{ height }}
      >
        No scored forecasts yet — they appear once each horizon comes due.
      </div>
    );
  }

  const W = 640;
  const H = height;
  const PAD = { l: 38, r: 10, t: 12, b: 24 };

  const times = series.map((p) => new Date(p.issuedAt).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const maxErr = Math.max(0.5, ...series.map((p) => p.errorKm));

  const x = (t: number) =>
    PAD.l + ((t - tMin) / Math.max(1, tMax - tMin)) * (W - PAD.l - PAD.r);
  const y = (e: number) => H - PAD.b - (e / maxErr) * (H - PAD.t - PAD.b);

  const horizons = Array.from(new Set(series.map((p) => p.horizonMin))).sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Prediction error by horizon">
        {/* horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const val = maxErr * f;
          return (
            <g key={f}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={y(val)}
                y2={y(val)}
                stroke="#e5e5e5"
                strokeWidth={1}
              />
              <text x={4} y={y(val) + 4} fontSize={10} fill="#a3a3a3">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* annotations behind the lines */}
        {annotations.map((a, i) => {
          const ax = x(new Date(a.at).getTime());
          if (!Number.isFinite(ax)) return null;
          return (
            <g key={i}>
              <line x1={ax} x2={ax} y1={PAD.t} y2={H - PAD.b} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1} />
              <text x={ax + 4} y={PAD.t + 10} fontSize={9} fill="#dc2626">
                {a.label}
              </text>
            </g>
          );
        })}

        {horizons.map((h) => {
          const pts = series
            .filter((p) => p.horizonMin === h)
            .sort((a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime());
          if (pts.length < 2) return null;
          const d = pts
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(new Date(p.issuedAt).getTime()).toFixed(1)} ${y(p.errorKm).toFixed(1)}`)
            .join(' ');
          return (
            <path key={h} d={d} fill="none" stroke={HORIZON_COLORS[h] ?? '#525252'} strokeWidth={1.8} />
          );
        })}

        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#a3a3a3" />
        <text x={4} y={PAD.t} fontSize={9} fill="#737373">
          km
        </text>
      </svg>

      <div className="mt-1 flex flex-wrap gap-3 px-2 text-xs">
        {horizons.map((h) => (
          <span key={h} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4"
              style={{ background: HORIZON_COLORS[h] ?? '#525252' }}
            />
            +{h / 60}h
          </span>
        ))}
      </div>
    </div>
  );
}
