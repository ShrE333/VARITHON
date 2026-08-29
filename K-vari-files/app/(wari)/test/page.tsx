'use client';

import { useApp } from '@/lib/app-context';
import { useRawFix } from '@/lib/use-raw-fix';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-neutral-100 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-mono text-neutral-800">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-neutral-200 p-4">
      <h2 className="text-sm font-bold text-neutral-600 mb-1">{title}</h2>
      {children}
    </div>
  );
}

export default function TestPage() {
  const { fix, routePos, sampleCount, rejectedCount, gpsStatus, route, simActive, retryGps } = useApp();
  // Wait for the route (and therefore the sim decision) before watching raw
  // fixes, so sim mode doesn't report a permission error here.
  const { raw, error } = useRawFix(!!route);

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-6 space-y-4">
      <h1 className="text-lg font-bold text-neutral-800">GPS Debug</h1>
      {simActive && (
        <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-3 py-2">
          Simulated fixes — this is the walking simulator, not real GPS.
        </p>
      )}

      <Section title="Status">
        <Row label="gpsStatus" value={gpsStatus} />
        <Row label="sampleCount" value={sampleCount} />
        <Row label="rejectedCount" value={rejectedCount} />
        <Row label="route loaded" value={route ? `yes (${route.totalKm.toFixed(1)} km)` : 'no'} />
        {error && <Row label="watch error" value={error} />}
      </Section>

      <button
        onClick={retryGps}
        className="tap-target w-full rounded-xl bg-neutral-800 text-white font-semibold px-4"
      >
        Restart GPS watch
      </button>

      <Section title="Raw fix (independent watch)">
        {raw ? (
          <>
            <Row label="lat" value={raw.lat.toFixed(6)} />
            <Row label="lng" value={raw.lng.toFixed(6)} />
            <Row label="accuracy" value={`${raw.accuracy.toFixed(1)} m`} />
            <Row label="speed" value={raw.speed != null ? `${raw.speed.toFixed(2)} m/s` : '—'} />
            <Row label="heading" value={raw.heading != null ? `${raw.heading.toFixed(0)}°` : '—'} />
            <Row label="timestamp" value={new Date(raw.timestamp).toLocaleTimeString()} />
          </>
        ) : (
          <p className="text-sm text-neutral-400">waiting…</p>
        )}
      </Section>

      <Section title="Smoothed fix (LocationTracker)">
        {fix ? (
          <>
            <Row label="lat" value={fix.lat.toFixed(6)} />
            <Row label="lng" value={fix.lng.toFixed(6)} />
            <Row label="accuracy" value={`${fix.accuracy.toFixed(1)} m`} />
            <Row label="timestamp" value={new Date(fix.timestamp).toLocaleTimeString()} />
          </>
        ) : (
          <p className="text-sm text-neutral-400">no accepted fix yet</p>
        )}
      </Section>

      <Section title="Chainage (RouteIndex.locate)">
        {routePos ? (
          <>
            <Row label="chainageKm" value={routePos.chainageKm.toFixed(3)} />
            <Row label="offsetM" value={routePos.offsetM.toFixed(1)} />
            <Row label="onRoute" value={String(routePos.onRoute)} />
            <Row label="snapped lat" value={routePos.snapped.lat.toFixed(6)} />
            <Row label="snapped lng" value={routePos.snapped.lng.toFixed(6)} />
          </>
        ) : (
          <p className="text-sm text-neutral-400">no chainage yet</p>
        )}
      </Section>

      <p className="text-xs text-neutral-400 text-center">
        Add <code>?sim=1</code> to the URL in dev to replay a simulated walk instead of real GPS.
      </p>
    </div>
  );
}
