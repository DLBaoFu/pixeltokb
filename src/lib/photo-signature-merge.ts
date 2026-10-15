export type MergeLayout = 'vertical' | 'horizontal';

export function mergedCanvasSize(photo: { width: number; height: number }, signature: { width: number; height: number }, layout: MergeLayout) {
  if (!['vertical', 'horizontal'].includes(layout) || ![photo.width, photo.height, signature.width, signature.height].every((value) => Number.isFinite(value) && value > 0)) throw new Error('INVALID_MERGE_LAYOUT');
  return layout === 'vertical'
    ? { width: Math.max(photo.width, signature.width), height: photo.height + signature.height }
    : { width: photo.width + signature.width, height: Math.max(photo.height, signature.height) };
}
