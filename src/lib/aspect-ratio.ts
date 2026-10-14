export type AspectRatio = {
  width: number;
  height: number;
  ratioWidth: number;
  ratioHeight: number;
  decimal: number;
  orientation: 'landscape' | 'portrait' | 'square';
};

export function isPositiveInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

export function greatestCommonDivisor(first: number, second: number): number {
  let a = Math.abs(Math.trunc(first));
  let b = Math.abs(Math.trunc(second));
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

export function calculateAspectRatio(width: number, height: number): AspectRatio | null {
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) return null;
  const divisor = greatestCommonDivisor(width, height);
  return {
    width,
    height,
    ratioWidth: width / divisor,
    ratioHeight: height / divisor,
    decimal: width / height,
    orientation: width === height ? 'square' : width > height ? 'landscape' : 'portrait'
  };
}

export function calculateCompanionDimension(ratio: AspectRatio, knownAxis: 'width' | 'height', value: number): number | null {
  if (!isPositiveInteger(value)) return null;
  const raw = knownAxis === 'width'
    ? value * ratio.ratioHeight / ratio.ratioWidth
    : value * ratio.ratioWidth / ratio.ratioHeight;
  if (!Number.isFinite(raw) || raw <= 0 || raw > Number.MAX_SAFE_INTEGER) return null;
  return Math.round(raw);
}
