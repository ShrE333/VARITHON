'use client';

export function AccuracyChip({ accuracyM }: { accuracyM: number }) {
  const tone =
    accuracyM <= 15
      ? 'bg-green-100 text-green-800'
      : accuracyM <= 30
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-800';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tone}`}>
      ± {Math.round(accuracyM)} m
    </span>
  );
}
