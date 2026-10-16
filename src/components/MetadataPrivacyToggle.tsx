import { useId } from 'react';

type Locale = 'en' | 'zh-cn' | 'zh-tw';

const copy = {
  en: {
    label: 'Erase EXIF and common privacy metadata',
    help: 'About privacy metadata',
    hint: 'Off (default): preserves supported EXIF, GPS, camera details, JPEG XMP/IPTC/comments, PNG text/time/EXIF chunks, and WebP EXIF/XMP. Orientation is normalized when pixels are transformed so the result stays upright. If the selected output format cannot preserve detected metadata, export stops instead of silently removing it. On: removes this supported privacy metadata and verifies the exported file. Processing stays on this device.'
  },
  'zh-cn': {
    label: '擦除 EXIF 和常见隐私元数据',
    help: '隐私元数据说明',
    hint: '关闭（默认）：保留支持范围内的 EXIF、GPS、相机信息、JPEG XMP/IPTC/注释、PNG 文本/时间/EXIF 块及 WebP EXIF/XMP。像素经过变换时会规范化方向字段，确保结果方向正确。若所选输出格式无法保留检测到的元数据，工具会停止导出，不会静默删除。开启：移除这些隐私元数据并校验导出文件。处理仅在本设备进行。'
  },
  'zh-tw': {
    label: '移除 EXIF 與常見隱私中繼資料',
    help: '隱私中繼資料說明',
    hint: '關閉（預設）：保留支援範圍內的 EXIF、GPS、相機資訊、JPEG XMP/IPTC/註解、PNG 文字/時間/EXIF 區塊及 WebP EXIF/XMP。像素經過變換時會規範化方向欄位，確保結果方向正確。若所選輸出格式無法保留偵測到的中繼資料，工具會停止匯出，不會靜默刪除。開啟：移除這些隱私中繼資料並驗證匯出檔案。處理只會在此裝置進行。'
  }
} as const;

const resultCopy = {
  en: { removed: 'EXIF and supported privacy metadata were removed and checked.', 'none-present': 'No supported privacy metadata was present in the source image.', preserved: 'Supported source privacy metadata was preserved and checked.' },
  'zh-cn': { removed: '已移除并检查 EXIF 和支持范围内的隐私元数据。', 'none-present': '源图片中未发现支持范围内的隐私元数据。', preserved: '已保留并检查源图片中支持范围内的隐私元数据。' },
  'zh-tw': { removed: '已移除並檢查 EXIF 與支援範圍內的隱私中繼資料。', 'none-present': '來源圖片中未發現支援範圍內的隱私中繼資料。', preserved: '已保留並驗證來源圖片中支援範圍內的隱私中繼資料。' }
} as const;

export function privacyMetadataResultText(locale: Locale, status: 'removed' | 'none-present' | 'preserved' | undefined) {
  return resultCopy[locale][status ?? 'none-present'];
}

export function privacyMetadataErrorText(locale: Locale, error: string | undefined) {
  if (error !== 'METADATA_PRESERVATION_FAILED') return undefined;
  return locale === 'en' ? 'Detected source metadata could not be preserved in the selected output format. Keep the source format, or turn on metadata erasure only if removal is intended.' : locale === 'zh-cn' ? '检测到的源元数据无法保留到所选输出格式。请保持源格式；只有确实要移除时才开启元数据擦除。' : '偵測到的來源中繼資料無法保留到所選輸出格式。請保持來源格式；只有確實要移除時才開啟中繼資料移除。';
}

export default function MetadataPrivacyToggle({ locale = 'en', checked, onChange }: { locale?: Locale; checked: boolean; onChange: (checked: boolean) => void }) {
  const text = copy[locale];
  const hintId = useId();
  return <div className="metadata-privacy-option">
    <strong>{text.label}</strong>
    <span className="metadata-privacy-controls">
      <button className={`metadata-privacy-switch ${checked ? 'is-on' : ''}`} type="button" role="switch" aria-checked={checked} aria-label={text.label} onClick={() => onChange(!checked)}><i /></button>
      <span className="metadata-privacy-help-wrap">
        <button className="metadata-privacy-help" type="button" aria-label={text.help} aria-describedby={hintId}>?</button>
        <small className="metadata-privacy-tooltip" id={hintId} role="tooltip">{text.hint}</small>
      </span>
    </span>
  </div>;
}
