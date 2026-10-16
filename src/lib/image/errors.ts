export type ImageErrorCode = 'FILE_TOO_LARGE' | 'BATCH_TOO_LARGE' | 'PIXEL_LIMIT' | 'FORMAT_UNSUPPORTED' | 'ANIMATION_UNSUPPORTED' | 'DECODE_FAILED' | 'ENCODER_UNAVAILABLE' | 'TARGET_UNREACHABLE' | 'PROCESSING_TIMEOUT' | 'OUT_OF_MEMORY' | 'CANCELLED';
export type PrivacyMetadataErrorCode = 'METADATA_RETAINED' | 'METADATA_CLEANUP_FAILED' | 'METADATA_PRESERVATION_FAILED';

export const errorMessages: Record<ImageErrorCode | PrivacyMetadataErrorCode, string> = {
  FILE_TOO_LARGE: 'The file exceeds the 20 MB limit. Choose a smaller image.',
  BATCH_TOO_LARGE: 'The batch exceeds the file-count or total-size limit.',
  PIXEL_LIMIT: 'The image exceeds the 40-megapixel limit. Resize it first.',
  FORMAT_UNSUPPORTED: 'Only static JPEG, PNG, and WebP files are supported.',
  ANIMATION_UNSUPPORTED: 'Animated images are not supported. Export a still frame and try again.',
  DECODE_FAILED: 'The image could not be decoded. The file may be damaged.',
  ENCODER_UNAVAILABLE: 'This browser cannot encode the selected output format.',
  TARGET_UNREACHABLE: 'The target cannot be reached with these settings. Raise the target or allow smaller dimensions.',
  PROCESSING_TIMEOUT: 'Processing exceeded 30 seconds. Try a smaller image.',
  OUT_OF_MEMORY: 'The browser ran out of memory while processing this PNG. Try a smaller image.',
  CANCELLED: 'Processing was canceled.',
  METADATA_RETAINED: 'The exported file still contains privacy metadata, so no download was created.',
  METADATA_CLEANUP_FAILED: 'Privacy metadata could not be removed and verified, so no download was created.',
  METADATA_PRESERVATION_FAILED: 'Detected source metadata could not be preserved in the selected output format. Keep the source format, or turn on metadata erasure if removal is intended.'
};
