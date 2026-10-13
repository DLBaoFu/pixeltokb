import type { PublishedLocale } from './guide-content';

export type GuideWorkflow = {
  situation: string;
  steps: Array<[string, string]>;
  image: string;
  caption: string;
  links: Array<[string, string]>;
};

type WorkflowMap = Record<PublishedLocale, Record<string, GuideWorkflow>>;

/**
 * The screenshots are generated from the real browser tools and each article
 * points to the run that answers its own question. Keeping this data separate
 * prevents the article template from silently reusing one generic workflow.
 */
export const guideWorkflows: WorkflowMap = {
  en: {
    'compress-without-changing-dimensions': {
      situation: 'This run answers one narrow question: can the encoded bytes fall while the 320 × 240 pixel grid stays exactly the same?',
      steps: [['Read the starting file', 'Use the checker once so the source format, bytes, and dimensions are known.'], ['Set a 20 KB ceiling', 'Keep the original dimensions enabled and choose the decimal 20 KB target in the compressor.'], ['Re-open the saved file', 'Only keep the download after the result card reports a real byte count under the ceiling, then check its signature and dimensions again.']],
      image: 'compress-20kb',
      caption: 'Browser run with a 320 × 240 JPEG and a decimal 20 KB target: the saved JPEG is 6,364 bytes and keeps both dimensions.',
      links: [['Open the compressor', '/compress-image/'], ['Check the saved file', '/image-size-checker/']]
    },
    'why-image-wont-fit-50kb': {
      situation: 'The 50 KB page is useful when a file is close to a limit but different image content or transparency changes what is reachable.',
      steps: [['Confirm the exact ceiling', 'Treat 50 KB as 50,000 bytes and note which formats the receiving service accepts.'], ['Run the reachable control case', 'Process the 320 × 240 JPEG with dimensions preserved so there is a real comparison point.'], ['Handle an unreachable case honestly', 'If a transparent PNG cannot meet a smaller target, keep the failure message and do not invent a downloadable file.']],
      image: 'compress-50kb',
      caption: 'Browser control run for the 50 KB article: the 320 × 240 JPEG finishes at 6,364 bytes, well below the 50,000-byte ceiling.',
      links: [['Try another target', '/compress-image/'], ['Inspect format and bytes', '/image-size-checker/']]
    },
    'kb-vs-kib': {
      situation: 'This example uses the same compressor with a 75 KB target so the unit label can be compared with the actual byte ceiling.',
      steps: [['Choose the unit named by the destination', 'Select decimal KB when the upload form says KB; do not silently substitute KiB.'], ['Read the exact target', '75 KB is 75,000 bytes, while the same byte count is 73.2421875 KiB.'], ['Leave a safety margin when unclear', 'A receiving service can reject a rounded boundary value, so aim below it when its unit is not documented.']],
      image: 'compress-75kb',
      caption: 'Browser run with a decimal 75 KB target: the target is 75,000 bytes and the generated 320 × 240 JPEG is 6,364 bytes.',
      links: [['Set a precise target', '/compress-image/'], ['Read exact file units', '/image-size-checker/']]
    },
    'check-image-size-and-dpi': {
      situation: 'Open the saved file before changing it. This inspection separates stored bytes, pixels, transparency, and density metadata instead of guessing one from another.',
      steps: [['Choose the file once', 'Pick the image from your device; the checker reads it in the browser.'], ['Record each field separately', 'The actual file is 2,930 bytes (2.93 KB / 2.86 KiB), 320 × 240 pixels, JPEG, and opaque.'], ['Check density only where it exists', 'Use the DPI checker for embedded density metadata and report “not embedded” when the file does not contain a value.']],
      image: 'inspect',
      caption: 'Actual browser inspection of opaque-gradient.jpg: 2,930 bytes, 2.93 KB, 2.86 KiB, JPEG, 320 × 240 pixels, and no transparency are shown separately.',
      links: [['Check image size', '/image-size-checker/'], ['Check DPI metadata', '/image-dpi-checker/']]
    },
    'compress-image-to-100kb': {
      situation: 'This is the straightforward upload case: a destination has a decimal 100 KB ceiling and the saved result still needs a second, exact check.',
      steps: [['Translate the rule', '100 KB means 100,000 bytes when the destination uses decimal KB.'], ['Process the source', 'Keep the 320 × 240 dimensions, choose 100 KB, and wait for the result card to verify the generated Blob.'], ['Verify what was saved', 'Open the downloaded file in the checker and compare its bytes, format, and pixels with the upload form.']],
      image: 'compress-100kb',
      caption: 'Complete browser run with a 320 × 240 JPEG and a decimal 100 KB target: the downloadable JPEG is 6,364 bytes.',
      links: [['Open the 100 KB compressor', '/compress-image/'], ['Verify the download', '/image-size-checker/']]
    }
  },
  'zh-cn': {
    'compress-without-changing-dimensions': {
      situation: '这个操作只回答一个问题：编码后的字节数能否下降，同时保持 320 × 240 的像素网格完全不变？',
      steps: [['先读取原文件', '先用检查工具确认原图格式、字节数和尺寸。'], ['设置 20 KB 上限', '保持原始尺寸，选择十进制 20 KB 目标，再运行压缩。'], ['重新打开保存文件', '只有结果卡给出不超过上限的实际字节数后才下载，再次核对签名和尺寸。']],
      image: 'compress-20kb',
      caption: '浏览器实测：320 × 240 JPEG，十进制 20 KB 目标；保存的 JPEG 为 6,364 字节，宽高保持不变。',
      links: [['打开压缩工具', '/compress-image/'], ['检查保存文件', '/image-size-checker/']]
    },
    'why-image-wont-fit-50kb': {
      situation: '50 KB 页面适合排查接近上限的文件，因为图片内容和透明度会改变实际可达的结果。',
      steps: [['确认精确上限', '把 50 KB 当作 50,000 字节，并先确认接收平台允许哪些格式。'], ['先跑可达的对照案例', '保持 320 × 240 尺寸处理 JPEG，得到真实的比较基准。'], ['如实处理不可达案例', '透明 PNG 无法达到更小目标时保留失败提示，不要虚构可下载文件。']],
      image: 'compress-50kb',
      caption: '50 KB 文章的浏览器对照操作：320 × 240 JPEG 最终为 6,364 字节，低于 50,000 字节上限。',
      links: [['尝试其他目标', '/compress-image/'], ['检查格式和字节', '/image-size-checker/']]
    },
    'kb-vs-kib': {
      situation: '这个案例使用 75 KB 目标，把单位标签与精确字节上限放在同一次真实操作里比较。',
      steps: [['按接收平台选择单位', '上传表单写 KB 就选十进制 KB，不要自动替换成 KiB。'], ['读取精确目标', '75 KB 是 75,000 字节；同一字节数等于 73.2421875 KiB。'], ['单位不明确时留余量', '接收平台可能拒绝四舍五入后的边界值，规则不清楚时应低于边界。']],
      image: 'compress-75kb',
      caption: '浏览器实测：十进制 75 KB 目标等于 75,000 字节，生成的 320 × 240 JPEG 为 6,364 字节。',
      links: [['设置精确目标', '/compress-image/'], ['读取文件单位', '/image-size-checker/']]
    },
    'check-image-size-and-dpi': {
      situation: '修改图片前先读取保存文件。检查器会把字节、像素、透明度和密度元数据分开显示，不会互相猜测。',
      steps: [['一次选择文件', '从设备选择图片，检查工具会在浏览器本地读取。'], ['分别记录每个字段', '这个文件是 2,930 字节（2.93 KB / 2.86 KiB）、JPEG、320 × 240 像素且不透明。'], ['只在有数据时填写 DPI', '再用 DPI 工具查看嵌入的密度；没有值就显示未嵌入，不要补写 72 DPI。']],
      image: 'inspect',
      caption: '真实浏览器检查 opaque-gradient.jpg：分别显示 2,930 字节、2.93 KB、2.86 KiB、JPEG、320 × 240 像素和无透明度。',
      links: [['检查图片大小', '/image-size-checker/'], ['检查 DPI 信息', '/image-dpi-checker/']]
    },
    'compress-image-to-100kb': {
      situation: '这是最直接的上传案例：接收平台有十进制 100 KB 上限，保存结果仍要再做一次精确检查。',
      steps: [['换算规则', '平台使用十进制 KB 时，100 KB 就是 100,000 字节。'], ['处理原图', '保持 320 × 240 尺寸，选择 100 KB，等待结果卡核对生成 Blob。'], ['核对保存文件', '用检查器重新打开下载文件，对比字节数、格式和像素尺寸。']],
      image: 'compress-100kb',
      caption: '完整浏览器操作：320 × 240 JPEG，十进制 100 KB 目标；可下载的 JPEG 为 6,364 字节。',
      links: [['打开 100 KB 压缩工具', '/compress-image/'], ['核对下载文件', '/image-size-checker/']]
    }
  },
  'zh-tw': {
    'compress-without-changing-dimensions': {
      situation: '這個操作只回答一個問題：編碼後的位元組數能否下降，同時維持 320 × 240 的像素網格完全不變？',
      steps: [['先讀取原檔案', '先用檢查工具確認原圖格式、位元組數與尺寸。'], ['設定 20 KB 上限', '維持原始尺寸，選擇十進位 20 KB 目標，再執行壓縮。'], ['重新開啟儲存檔案', '只有結果卡給出不超過上限的實際位元組數後才下載，再次核對簽章與尺寸。']],
      image: 'compress-20kb',
      caption: '瀏覽器實測：320 × 240 JPEG，十進位 20 KB 目標；儲存的 JPEG 為 6,364 位元組，寬高維持不變。',
      links: [['開啟壓縮工具', '/compress-image/'], ['檢查儲存檔案', '/image-size-checker/']]
    },
    'why-image-wont-fit-50kb': {
      situation: '50 KB 頁面適合排查接近上限的檔案，因為圖片內容與透明度會改變實際可達的結果。',
      steps: [['確認實際上限', '把 50 KB 當作 50,000 位元組，並先確認接收平台允許哪些格式。'], ['先跑可達的對照案例', '維持 320 × 240 尺寸處理 JPEG，得到真實的比較基準。'], ['如實處理無法達標的案例', '透明 PNG 無法達到更小目標時保留失敗提示，不要虛構可下載檔案。']],
      image: 'compress-50kb',
      caption: '50 KB 文章的瀏覽器對照操作：320 × 240 JPEG 最終為 6,364 位元組，低於 50,000 位元組上限。',
      links: [['嘗試其他目標', '/compress-image/'], ['檢查格式與位元組', '/image-size-checker/']]
    },
    'kb-vs-kib': {
      situation: '這個案例使用 75 KB 目標，把單位標示與實際位元組上限放在同一次操作中比較。',
      steps: [['依接收平台選擇單位', '上傳表單寫 KB 就選十進位 KB，不要自動替換成 KiB。'], ['讀取實際目標', '75 KB 是 75,000 位元組；同一位元組數等於 73.2421875 KiB。'], ['單位不明時保留餘量', '接收平台可能拒絕四捨五入後的界線值，規則不清楚時應低於界線。']],
      image: 'compress-75kb',
      caption: '瀏覽器實測：十進位 75 KB 目標等於 75,000 位元組，產生的 320 × 240 JPEG 為 6,364 位元組。',
      links: [['設定精確目標', '/compress-image/'], ['讀取檔案單位', '/image-size-checker/']]
    },
    'check-image-size-and-dpi': {
      situation: '修改圖片前先讀取儲存檔案。檢查器會把位元組、像素、透明度與密度中繼資料分開顯示，不會互相猜測。',
      steps: [['一次選擇檔案', '從裝置選擇圖片，檢查工具會在瀏覽器本機讀取。'], ['分別記錄每個欄位', '這個檔案是 2,930 位元組（2.93 KB / 2.86 KiB）、JPEG、320 × 240 像素且不透明。'], ['只在有資料時填寫 DPI', '再用 DPI 工具查看嵌入的密度；沒有數值就顯示未嵌入，不要補寫 72 DPI。']],
      image: 'inspect',
      caption: '真實瀏覽器檢查 opaque-gradient.jpg：分別顯示 2,930 位元組、2.93 KB、2.86 KiB、JPEG、320 × 240 像素與沒有透明度。',
      links: [['檢查圖片大小', '/image-size-checker/'], ['檢查 DPI 資訊', '/image-dpi-checker/']]
    },
    'compress-image-to-100kb': {
      situation: '這是最直接的上傳案例：接收平台有十進位 100 KB 上限，儲存結果仍要再做一次精確檢查。',
      steps: [['換算規則', '平台使用十進位 KB 時，100 KB 就是 100,000 位元組。'], ['處理原圖', '維持 320 × 240 尺寸，選擇 100 KB，等待結果卡核對產生的 Blob。'], ['核對儲存檔案', '用檢查器重新開啟下載檔案，比對位元組數、格式和像素尺寸。']],
      image: 'compress-100kb',
      caption: '完整瀏覽器操作：320 × 240 JPEG，十進位 100 KB 目標；可下載的 JPEG 為 6,364 位元組。',
      links: [['開啟 100 KB 壓縮工具', '/compress-image/'], ['核對下載檔案', '/image-size-checker/']]
    }
  }
};
