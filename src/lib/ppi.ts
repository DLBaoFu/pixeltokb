export type PrintUnit = 'in' | 'mm';

export type PpiCalculation = {
  horizontal: number;
  vertical: number;
  diagonal: number;
  dimensionsMatch: boolean;
};

export const MILLIMETRES_PER_INCH = 25.4;

export function isPositiveFinite(value: number) {
  return Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER;
}

export function toInches(value: number, unit: PrintUnit): number | null {
  if (!isPositiveFinite(value)) return null;
  return unit === 'mm' ? value / MILLIMETRES_PER_INCH : value;
}

export function convertPrintUnit(value: number, from: PrintUnit, to: PrintUnit): number | null {
  const inches = toInches(value, from);
  if (!inches) return null;
  return to === 'mm' ? inches * MILLIMETRES_PER_INCH : inches;
}

export function calculatePpi(pixelWidth: number, pixelHeight: number, printWidth: number, printHeight: number, unit: PrintUnit): PpiCalculation | null {
  if (!Number.isSafeInteger(pixelWidth) || !Number.isSafeInteger(pixelHeight) || pixelWidth <= 0 || pixelHeight <= 0) return null;
  const widthInches = toInches(printWidth, unit);
  const heightInches = toInches(printHeight, unit);
  if (!widthInches || !heightInches) return null;
  const horizontal = pixelWidth / widthInches;
  const vertical = pixelHeight / heightInches;
  const diagonal = Math.hypot(pixelWidth, pixelHeight) / Math.hypot(widthInches, heightInches);
  if (![horizontal, vertical, diagonal].every(isPositiveFinite)) return null;
  return {
    horizontal,
    vertical,
    diagonal,
    dimensionsMatch: Math.abs(horizontal - vertical) / Math.max(horizontal, vertical) < 0.001
  };
}
