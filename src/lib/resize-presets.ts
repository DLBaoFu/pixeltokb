export type ResizeMode = 'fit' | 'fill' | 'stretch';
export type PhysicalUnit = 'mm' | 'in';

export const pixelResizePresets = [
  { slug: 'resize-image-to-1080x1080', width: 1080, height: 1080, mode: 'fit' as const },
  { slug: 'resize-image-to-1920x1080', width: 1920, height: 1080, mode: 'fit' as const },
  { slug: 'resize-image-to-1280x720', width: 1280, height: 720, mode: 'fit' as const },
  { slug: 'resize-image-to-1200x630', width: 1200, height: 630, mode: 'fit' as const },
  { slug: 'resize-image-to-1080x1920', width: 1080, height: 1920, mode: 'fit' as const },
  { slug: 'resize-image-to-600x600', width: 600, height: 600, mode: 'fit' as const }
] as const;

export const physicalResizePresets = [
  { slug: 'photo-2x2-inch', width: 2, height: 2, unit: 'in' as const, dpi: 300 },
  { slug: 'photo-35x45-mm', width: 35, height: 45, unit: 'mm' as const, dpi: 300 },
  { slug: 'photo-30x40-mm', width: 30, height: 40, unit: 'mm' as const, dpi: 300 },
  { slug: 'photo-50x50-mm', width: 50, height: 50, unit: 'mm' as const, dpi: 300 }
] as const;

const positiveInteger = (value: string | null, maximum: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null;
};

const positiveDecimal = (value: string | null, maximum: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= maximum ? parsed : null;
};

export function resizePresetFromSearch(search: string) {
  const params = new URLSearchParams(search);
  const width = positiveInteger(params.get('width'), 10_000);
  const height = positiveInteger(params.get('height'), 10_000);
  const mode = params.get('mode');
  if (!width || !height || !['fit', 'fill', 'stretch'].includes(mode ?? '')) return null;
  return { width, height, mode: mode as ResizeMode };
}

export function physicalPresetFromSearch(search: string) {
  const params = new URLSearchParams(search);
  const width = positiveDecimal(params.get('width'), 10_000);
  const height = positiveDecimal(params.get('height'), 10_000);
  const dpi = positiveInteger(params.get('dpi'), 1200);
  const unit = params.get('unit');
  if (!width || !height || !dpi || (unit !== 'mm' && unit !== 'in')) return null;
  return { width, height, dpi, unit: unit as PhysicalUnit };
}
