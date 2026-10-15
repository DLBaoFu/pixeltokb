import type { CompressionGroup } from './compression-groups';
import type { PublishedLocale } from './guide-content';

type RangeCopy = {
  title: string;
  intro: string;
  points: Array<[string, string]>;
  checkTitle: string;
  check: string;
};

export const compressionPageContent: Record<PublishedLocale, Record<CompressionGroup, RangeCopy>> = {
  en: {
    small: {
      title: 'When the upload limit is strict',
      intro: 'Use the 10–100 KB range for forms, listings, and document uploads. Choose 20 KB for a strict ceiling, 50 KB when you need a little more room, or 100 KB when the destination allows a larger file; each target is checked by actual bytes.',
      points: [['Protect text edges', 'Keep the original dimensions when the image contains small labels or signatures, then inspect the saved file at its real size.'], ['Allow a reachable target', 'A detailed or transparent image may not fit while pixels are locked. If the tool reports an unreachable target, change the pixels or use the receiving service’s larger limit.']],
      checkTitle: 'Independent check before upload',
      check: 'Read the downloaded bytes and dimensions in the image checker. Do not treat a rounded “10 KB” or “50 KB” label as proof that the file is below the service’s exact byte ceiling.'
    },
    medium: {
      title: 'For everyday photos and documents',
      intro: 'The 200–500 KB range is a practical middle ground for profile photos, application attachments, and document images that need more detail than a tiny thumbnail.',
      points: [['Compare 300 KB with 500 KB', 'Start near 300 KB for a smaller upload, then move toward 500 KB when text, hair, or fine edges look soft. The useful comparison is the saved file, not the target label.'], ['Confirm the accepted format', 'JPEG works for photographs, WebP can be smaller when the destination accepts it, and PNG is useful for transparency or sharp graphics.']],
      checkTitle: 'Independent check before upload',
      check: 'Open both candidates in the checker and record actual bytes, dimensions, format, and transparency. Keep the smaller file only when it still meets the receiving form’s visual and format rules.'
    },
    large: {
      title: 'For phone photos under one megabyte',
      intro: 'The 500 KB–1 MB range suits phone photos and screenshots that need visible detail but still have to pass a sub-megabyte upload rule.',
      points: [['Preserve useful detail', 'Begin near 750 KB when faces, text, or fine texture matter. A smaller target can be appropriate for a thumbnail but may make readable text break up.'], ['Check the source dimensions', 'A large phone photo can be reduced in pixels before compression if the destination does not need the original camera dimensions. This often protects detail better than forcing a very low quality setting.']],
      checkTitle: 'Independent check before upload',
      check: 'Verify the saved result at 500 KB, 750 KB, or 1 MB with the checker. Compare the dimensions and format against the destination before replacing the original.'
    },
    megabytes: {
      title: 'For high-resolution originals',
      intro: 'The 2–5 MB range is for destinations that accept a larger image and where keeping photographic detail matters more than reaching a tiny upload size.',
      points: [['Decide whether the pixels are needed', 'A 2 MB target may be enough for a form or preview. Keep 3–5 MB when the destination genuinely needs more detail and the original is still within the 20 MB input limit.'], ['Do not confuse bytes with print size', 'A larger file does not automatically mean a larger print. Check pixels and DPI separately when the destination describes a physical size or resolution requirement.']],
      checkTitle: 'Independent check before upload',
      check: 'Open the saved file and record its actual bytes, dimensions, format, and DPI availability. Keep the original until the receiving service accepts the checked copy.'
    }
  },
  'zh-cn': {
    small: {
      title: '上传上限很严格时',
      intro: '10–100 KB 区间适合表单、列表和文件上传。目标较严格时选 20 KB，需要多一点空间时选 50 KB，平台允许更大文件时选 100 KB；每个目标都会按实际字节数检查。',
      points: [['保护文字边缘', '图片里有小字或签名时先保持原始尺寸，再按保存后的实际大小检查文件。'], ['先确认目标可达', '锁定像素时，细节多或带透明度的图片可能无法达到目标。工具提示无法达标时，应调整像素或改用接收平台允许的更大上限。']],
      checkTitle: '上传前的独立核对',
      check: '用图片检查工具读取下载文件的实际字节数和尺寸。不要把四舍五入后的“10 KB”或“50 KB”标签当作低于平台精确字节上限的证明。'
    },
    medium: {
      title: '普通照片和文档上传',
      intro: '200–500 KB 区间适合头像、申请附件和文档图片，比小缩略图保留更多细节。',
      points: [['比较 300 KB 和 500 KB', '先从 300 KB 开始获得更小的上传文件；文字、头发或细边缘发软时，再尝试接近 500 KB。真正要比较的是保存文件，而不是目标标签。'], ['确认接收格式', '照片通常适合 JPEG；接收平台允许时 WebP 可能更小；需要透明度或锐利图形时使用 PNG。']],
      checkTitle: '上传前的独立核对',
      check: '在检查工具中分别打开两个候选文件，记录实际字节数、尺寸、格式和透明度。只有同时符合表单的视觉和格式要求，才保留更小的文件。'
    },
    large: {
      title: '手机照片需要控制在 1 MB 内时',
      intro: '500 KB–1 MB 区间适合手机照片和截图：保留可见细节，同时满足小于 1 MB 的上传规则。',
      points: [['保留有用细节', '人脸、文字或细纹理重要时可从 750 KB 附近开始。更小目标适合缩略图，但可能让文字边缘破碎。'], ['先看原始尺寸', '接收平台不要求相机原始像素时，可以先缩小手机照片，再压缩文件。相比强行降低质量，这样往往更容易保留细节。']],
      checkTitle: '上传前的独立核对',
      check: '用检查工具核对 500 KB、750 KB 或 1 MB 目标生成的保存文件。提交前把尺寸和格式与接收平台要求逐项对照。'
    },
    megabytes: {
      title: '高分辨率原图需要保留细节时',
      intro: '2–5 MB 区间适合允许较大图片的接收平台；这时保留照片细节比追求极小文件更重要。',
      points: [['先判断是否真的需要像素', '表单或预览通常 2 MB 就够；只有接收平台确实需要更多细节、且原图在 20 MB 输入限制内时，才保留 3–5 MB。'], ['不要把字节等同于打印尺寸', '文件更大不代表打印尺寸一定更大。平台提出实体尺寸或分辨率要求时，应分别检查像素和 DPI。']],
      checkTitle: '上传前的独立核对',
      check: '打开保存文件，记录实际字节数、尺寸、格式和 DPI 是否存在。确认接收平台接受检查后的副本前，不要删除原图。'
    }
  },
  'zh-tw': {
    small: {
      title: '上傳上限很嚴格時',
      intro: '10–100 KB 區間適合表單、清單和檔案上傳。上限嚴格時選 20 KB，需要多一點空間時選 50 KB，平台允許較大檔案時選 100 KB；每個目標都會依實際位元組數檢查。',
      points: [['保護文字邊緣', '圖片裡有小字或簽名時先維持原始尺寸，再按儲存後的實際大小檢查檔案。'], ['先確認目標可達', '鎖定像素時，細節多或帶透明度的圖片可能無法達到目標。工具提示無法達標時，應調整像素或改用接收平台允許的較大上限。']],
      checkTitle: '上傳前的獨立核對',
      check: '用圖片檢查工具讀取下載檔案的實際位元組數和尺寸。不要把四捨五入後的「10 KB」或「50 KB」標籤當作低於平台精確位元組上限的證明。'
    },
    medium: {
      title: '普通照片和文件上傳',
      intro: '200–500 KB 區間適合頭像、申請附件和文件圖片，比小縮圖保留更多細節。',
      points: [['比較 300 KB 和 500 KB', '先從 300 KB 開始取得較小的上傳檔案；文字、頭髮或細邊緣變模糊時，再嘗試接近 500 KB。真正要比較的是儲存檔案，而不是目標標籤。'], ['確認接收格式', '照片通常適合 JPEG；接收平台允許時 WebP 可能更小；需要透明度或銳利圖形時使用 PNG。']],
      checkTitle: '上傳前的獨立核對',
      check: '在檢查工具中分別開啟兩個候選檔案，記錄實際位元組數、尺寸、格式和透明度。只有同時符合表單的視覺與格式要求，才保留較小的檔案。'
    },
    large: {
      title: '手機照片需要控制在 1 MB 內時',
      intro: '500 KB–1 MB 區間適合手機照片和截圖：保留可見細節，同時符合小於 1 MB 的上傳規則。',
      points: [['保留有用細節', '人臉、文字或細紋理重要時可從 750 KB 附近開始。較小目標適合縮圖，但可能讓文字邊緣破碎。'], ['先看原始尺寸', '接收平台不要求相機原始像素時，可以先縮小手機照片，再壓縮檔案。相比強行降低品質，這樣往往更容易保留細節。']],
      checkTitle: '上傳前的獨立核對',
      check: '用檢查工具核對 500 KB、750 KB 或 1 MB 目標產生的儲存檔案。提交前把尺寸和格式與接收平台要求逐項對照。'
    },
    megabytes: {
      title: '高解析度原圖需要保留細節時',
      intro: '2–5 MB 區間適合允許較大圖片的接收平台；這時保留照片細節比追求極小檔案更重要。',
      points: [['先判斷是否真的需要像素', '表單或預覽通常 2 MB 就足夠；只有接收平台確實需要更多細節、且原圖在 20 MB 輸入限制內時，才保留 3–5 MB。'], ['不要把位元組等同於列印尺寸', '檔案較大不代表列印尺寸一定較大。平台提出實體尺寸或解析度要求時，應分別檢查像素和 DPI。']],
      checkTitle: '上傳前的獨立核對',
      check: '開啟儲存檔案，記錄實際位元組數、尺寸、格式和 DPI 是否存在。確認接收平台接受檢查後的副本前，不要刪除原圖。'
    }
  }
};
