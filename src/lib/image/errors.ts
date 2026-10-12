export type ImageErrorCode = 'FILE_TOO_LARGE' | 'PIXEL_LIMIT' | 'FORMAT_UNSUPPORTED' | 'ANIMATION_UNSUPPORTED' | 'DECODE_FAILED' | 'ENCODER_UNAVAILABLE' | 'TARGET_UNREACHABLE' | 'PROCESSING_TIMEOUT' | 'CANCELLED';

export const errorMessages: Record<ImageErrorCode, string> = {
  FILE_TOO_LARGE: 'The file exceeds the 20 MB limit. Choose a smaller image.',
  PIXEL_LIMIT: 'The image exceeds the 40-megapixel limit. Resize it first.',
  FORMAT_UNSUPPORTED: 'Only static JPEG, PNG, and WebP files are supported.',
  ANIMATION_UNSUPPORTED: 'Animated images are not supported. Export a still frame and try again.',
  DECODE_FAILED: 'The image could not be decoded. The file may be damaged.',
  ENCODER_UNAVAILABLE: 'This browser cannot encode the selected output format.',
  TARGET_UNREACHABLE: 'The target cannot be reached with these settings. Raise the target or allow smaller dimensions.',
  PROCESSING_TIMEOUT: 'Processing exceeded 30 seconds. Try a smaller image.',
  CANCELLED: 'Processing was canceled.'
};
