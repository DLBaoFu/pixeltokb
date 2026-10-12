export const sizePresets = [
  { slug: '10kb', label: '10 KB', bytes: 10_000 },
  { slug: '20kb', label: '20 KB', bytes: 20_000 },
  { slug: '30kb', label: '30 KB', bytes: 30_000 },
  { slug: '50kb', label: '50 KB', bytes: 50_000 },
  { slug: '100kb', label: '100 KB', bytes: 100_000 }
] as const;

export type SizeUnit = 'KB' | 'KiB' | 'MB' | 'MiB';
export function bytesFor(value: number, unit: SizeUnit): number {
  return Math.round(value * ({ KB: 1000, KiB: 1024, MB: 1_000_000, MiB: 1_048_576 }[unit]));
}

export function convertTargetUnit(value: number, from: SizeUnit, to: SizeUnit): number {
  return Number((bytesFor(value, from) / bytesFor(1, to)).toFixed(10));
}
