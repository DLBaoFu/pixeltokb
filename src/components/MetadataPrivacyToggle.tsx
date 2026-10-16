type Locale = 'en' | 'zh-cn' | 'zh-tw';

const copy = {
  en: {
    label: 'Erase EXIF and common privacy metadata',
    hint: 'On: removes EXIF (including GPS and camera details), JPEG XMP/IPTC/comments, PNG text/time/EXIF chunks, and WebP EXIF/XMP from the exported image. DPI and colour profiles are kept where the format supports them. Off: skips this cleanup; the browser encoder may still remove metadata, so preservation is not guaranteed. Processing stays on this device.'
  },
  'zh-cn': {
    label: '擦除 EXIF 和常见隐私元数据',
    hint: '开启后会从导出图片中移除 EXIF（包括 GPS 和相机信息）、JPEG XMP/IPTC/注释、PNG 文本/时间/EXIF 块及 WebP EXIF/XMP；格式支持的 DPI 和色彩配置会保留。关闭后会跳过这一步，但浏览器编码器仍可能移除元数据，不能保证保留原信息。处理仅在本设备进行。'
  },
  'zh-tw': {
    label: '移除 EXIF 與常見隱私中繼資料',
    hint: '開啟後會從匯出圖片中移除 EXIF（包括 GPS 與相機資訊）、JPEG XMP/IPTC/註解、PNG 文字/時間/EXIF 區塊及 WebP EXIF/XMP；格式支援的 DPI 與色彩描述檔會保留。關閉後會略過這一步，但瀏覽器編碼器仍可能移除中繼資料，無法保證保留原始資訊。處理只會在此裝置進行。'
  }
} as const;

const resultCopy = {
  en: { removed: 'EXIF and supported privacy metadata were removed and checked.', 'none-present': 'No supported privacy metadata was found in the exported image.', unchecked: 'Privacy metadata cleanup was skipped; the browser encoder may still remove metadata.' },
  'zh-cn': { removed: '已移除并检查 EXIF 和支持范围内的隐私元数据。', 'none-present': '导出图片中未发现支持范围内的隐私元数据。', unchecked: '已跳过隐私元数据清理；浏览器编码器仍可能移除元数据。' },
  'zh-tw': { removed: '已移除並檢查 EXIF 與支援範圍內的隱私中繼資料。', 'none-present': '匯出圖片中未發現支援範圍內的隱私中繼資料。', unchecked: '已略過隱私中繼資料清理；瀏覽器編碼器仍可能移除中繼資料。' }
} as const;

export function privacyMetadataResultText(locale: Locale, status: 'removed' | 'none-present' | 'unchecked' | undefined) {
  return resultCopy[locale][status ?? 'unchecked'];
}

export default function MetadataPrivacyToggle({ locale = 'en', checked, onChange }: { locale?: Locale; checked: boolean; onChange: (checked: boolean) => void }) {
  const text = copy[locale];
  return <label className="metadata-privacy-option">
    <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span><strong>{text.label}</strong><small>{text.hint}</small></span>
  </label>;
}
