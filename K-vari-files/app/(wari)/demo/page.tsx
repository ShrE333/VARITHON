'use client';

/**
 * Demo dashboard. SIMULATION — and it says so, loudly, before anyone asks.
 *
 * Three panels, per the brief: the map with actual vs model, the error chart
 * per horizon, and the live accuracy table. Plus the airplane-mode toggle,
 * because the offline behaviour is the thing worth showing and it needs to
 * be one click.
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { ErrorChart, type ErrorPoint } from '@/components/ErrorChart';
import { useAirplaneMode } from '@/lib/palki/airplane';
import { usePacket, usePalkiRoute } from '@/lib/palki/use-packet';
import { viewFor } from '@/lib/palki/client';

const DemoMap = dynamic(() => import('@/components/DemoMap').then((m) => m.DemoMap), {
  ssr: false,
  loading: () => <div className="animate-pulse rounded-xl bg-neutral-200" style={{ height: 360 }} />,
});

interface AccuracyRow {
  horizonMin: number;
  n: number;
  maeKm: number | null;
  worstKm: number | null;
}

export default function DemoPage() {
  const [airplane, setAirplane] = useAirplaneMode();
  const { packet } = usePacket(false); // dashboard always fetches; only the pilgrim view goes offline
  const coordinates = usePalkiRoute(packet?.routeVersion ?? null);

  const [accuracy, setAccuracy] = useState<AccuracyRow[]>([]);
  const [series, setSeries] = useState<ErrorPoint[]>([]);
  const [truth, setTruth] = useState<{ ts: string; sKm: number }[]>([]);
  const [totalScored, setTotalScored] = useState(0);

  const poll = useCallback(async () => {
    try {
      const [accRes, truthRes] = await Promise.all([
        fetch('/api/v1/palki/accuracy', { cache: 'no-store' }),
        fetch('/api/v1/palki/truth', { cache: 'no-store' }),
      ]);
      if (accRes.ok) {
        const a = await accRes.json();
        setAccuracy(a.horizons ?? []);
        setSeries(a.series ?? []);
        setTotalScored(a.totalScored ?? 0);
      }
      if (truthRes.ok) {
        const tr = await truthRes.json();
        setTruth(tr.series ?? []);
      }
    } catch {
      // The dashboard is allowed to be quiet about transient failures.
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [poll]);

  const view = packet ? viewFor(packet, new Date()) : null;
  const actualSKm = truth.length ? truth[truth.length - 1]!.sKm : null;
  const modelSKm = packet?.current.sKm ?? null;
  const liveErrorKm =
    actualSKm !== null && modelSKm !== null ? Math.abs(actualSKm - modelSKm) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      {/* ---- Disclosure first, not buried in a footnote. ---- */}
      <header className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-red-800">SIMULATION — not a live Wari</h1>
            <p className="mt-0.5 text-sm text-red-700">
              A simulator is playing the role of the Palki. The estimator receives only its
              GPS pings, every 30 simulated minutes, with noise.
            </p>
          </div>
          <button
            onClick={() => setAirplane(!airplane)}
            className={`tap-target rounded-xl px-5 font-bold shadow-sm ${
              airplane ? 'bg-amber-500 text-white' : 'bg-white text-neutral-700 border border-neutral-300'
            }`}
          >
            ✈️ Airplane mode: {airplane ? 'ON' : 'OFF'}
          </button>
        </div>
        <p className="mt-2 text-xs font-semibold text-red-900">
          The model has never seen the simulator&apos;s internal state — not its daily speed
          multiplier, not the heat slowdown, not the injected halt.
        </p>
      </header>

      {/* ---- Panel 1: the map ---- */}
      <section className="rounded-xl border border-neutral-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-red-600" /> simulated actual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-600" /> model estimate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-6 rounded bg-blue-300 opacity-60" /> forecast cone
          </span>
          {liveErrorKm !== null && (
            <span className="ml-auto font-mono text-xs text-neutral-600">
              live error {liveErrorKm.toFixed(3)} km
            </span>
          )}
        </div>
        {coordinates && packet && view ? (
          <DemoMap
            coordinates={coordinates}
            actualSKm={actualSKm}
            modelSKm={modelSKm}
            forecast={packet.forecast}
          />
        ) : (
          <div className="flex items-center justify-center rounded-xl bg-neutral-100 text-sm text-neutral-500" style={{ height: 360 }}>
            Waiting for the simulator. Start it with:{' '}
            <code className="ml-1">node sim/simulator.mjs --speed 300 --seed 7</code>
          </div>
        )}
      </section>

      {/* ---- Panel 2: error over time ---- */}
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-1 font-bold text-neutral-800">Prediction error by horizon</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Spikes are left in. A model that recovers from being wrong is the point.
        </p>
        <ErrorChart series={series} />
      </section>

      {/* ---- Panel 3: accuracy ---- */}
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 font-bold text-neutral-800">Mean absolute error</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
              <th className="pb-2">Horizon</th>
              <th className="pb-2">MAE (km)</th>
              <th className="pb-2">Worst (km)</th>
              <th className="pb-2">Scored</th>
            </tr>
          </thead>
          <tbody>
            {accuracy.map((r) => (
              <tr key={r.horizonMin} className="border-b border-neutral-100">
                <td className="py-2 font-medium">+{r.horizonMin / 60}h</td>
                <td className="py-2 font-mono">{r.maeKm === null ? '—' : r.maeKm.toFixed(3)}</td>
                <td className="py-2 font-mono text-neutral-500">
                  {r.worstKm === null ? '—' : r.worstKm.toFixed(3)}
                </td>
                <td className="py-2 text-neutral-500">{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-neutral-500">
          {totalScored} forecasts scored so far. A forecast is graded only once its target time
          has passed, against the simulator&apos;s recorded truth.
        </p>
      </section>

      <p className="pb-6 text-center text-xs text-neutral-400">
        Route-constrained motion model with schedule priors and recursive Bayesian correction.
        Not a neural network.
      </p>
    </div>
  );
}
