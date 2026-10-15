export type Rgb = { r: number; g: number; b: number };

export function colorDistanceSquared(a: Rgb, b: Rgb) {
  const red = a.r - b.r;
  const green = a.g - b.g;
  const blue = a.b - b.b;
  return red * red + green * green + blue * blue;
}

/**
 * Makes pixels close to a sampled, uniform background transparent. This is a
 * deliberately simple threshold tool, not subject-aware segmentation.
 */
export function removeSampledBackground(data: Uint8ClampedArray, background: Rgb, tolerance: number) {
  if (data.length % 4 !== 0) throw new Error('INVALID_PIXEL_DATA');
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 442) throw new Error('INVALID_TOLERANCE');
  const threshold = tolerance * tolerance;
  let removed = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    if (colorDistanceSquared({ r: data[index], g: data[index + 1], b: data[index + 2] }, background) <= threshold) {
      data[index + 3] = 0;
      removed += 1;
    }
  }
  return { data, removed };
}
