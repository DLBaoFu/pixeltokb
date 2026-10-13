export const compressionGroups = {
  small: {
    slug: 'compress-image', label: '10–100 KB', minBytes: 10_000, maxBytes: 100_000,
    defaultBytes: 50_000, defaultUnit: 'KB', presets: [10_000, 20_000, 30_000, 50_000, 100_000]
  },
  medium: {
    slug: 'compress-image-200kb-to-500kb', label: '200–500 KB', minBytes: 200_000, maxBytes: 500_000,
    defaultBytes: 300_000, defaultUnit: 'KB', presets: [200_000, 300_000, 400_000, 500_000]
  },
  large: {
    slug: 'compress-image-500kb-to-1mb', label: '500 KB–1 MB', minBytes: 500_000, maxBytes: 1_000_000,
    defaultBytes: 750_000, defaultUnit: 'KB', presets: [500_000, 750_000, 1_000_000]
  },
  megabytes: {
    slug: 'compress-image-2mb-to-5mb', label: '2–5 MB', minBytes: 2_000_000, maxBytes: 5_000_000,
    defaultBytes: 2_000_000, defaultUnit: 'MB', presets: [2_000_000, 3_000_000, 4_000_000, 5_000_000]
  }
} as const;

export type CompressionGroup = keyof typeof compressionGroups;
export const compressionGroupOrder: CompressionGroup[] = ['small', 'medium', 'large', 'megabytes'];
export const compressionGroupForSlug = (slug: string): CompressionGroup | undefined =>
  slug === 'compress-image' ? 'small' : undefined;

export const unifiedCompressionConfig = {
  slug: 'compress-image',
  label: '1 KB–5 MB',
  minBytes: 1_000,
  maxBytes: 5_000_000,
  defaultBytes: 50_000,
  defaultUnit: 'KB' as const,
  presets: [10_000, 20_000, 30_000, 50_000, 100_000, 200_000, 300_000, 400_000, 500_000, 750_000, 1_000_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000]
};

export const compressionRangePresets: Record<CompressionGroup, { query: string; recommendedBytes: number }> = {
  small: { query: '10-100kb', recommendedBytes: 50_000 },
  medium: { query: '200-500kb', recommendedBytes: 300_000 },
  large: { query: '500kb-1mb', recommendedBytes: 750_000 },
  megabytes: { query: '2mb-5mb', recommendedBytes: 2_000_000 }
};

export function compressionGroupForPreset(value: string): CompressionGroup | undefined {
  return compressionGroupOrder.find((group) => compressionRangePresets[group].query === value);
}

export function compressionPresetLabel(bytes: number): string {
  return bytes >= 1_000_000 ? `${bytes / 1_000_000} MB` : `${bytes / 1000} KB`;
}
