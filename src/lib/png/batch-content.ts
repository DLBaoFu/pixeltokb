import type { PngLocale } from './content';

export type PngBatchCopy = {
  heading: string; intro: string; toolLabel: string; choose: string; drop: string; limits: string;
  start: string; cancel: string; retry: string; reset: string; zip: (count: number) => string; preparingZip: string;
  idle: string; ready: (count: number, size: string) => string; running: (done: number, total: number) => string; complete: (success: number, total: number) => string;
  tooMany: string; totalTooLarge: string; lowMemory: string; reducedConcurrency: string; noSuccess: string;
  queued: string; processing: string; optimized: string; unchanged: string; failed: string; cancelled: string; download: string;
  original: string; result: string; saved: string; summaryLabel: string;
};

export const pngBatchCopy: Record<PngLocale, PngBatchCopy> = {
  en: {
    heading: 'Batch PNG optimization', intro: 'Optimize up to 20 static PNG files in one local queue. Successful files can be downloaded separately or together as a ZIP.', toolLabel: 'Batch lossless PNG optimization', choose: 'Choose PNG files', drop: 'Drop PNG files here', limits: 'Up to 20 files · 100 MB total · 20 MB each',
    start: 'Optimize batch →', cancel: 'Cancel batch', retry: 'Retry failed files', reset: 'Clear batch', zip: (count) => `Download ${count} successful ${count === 1 ? 'file' : 'files'} as ZIP`, preparingZip: 'Preparing ZIP…',
    idle: 'Choose two or more PNG files, or use this queue for a single file when you need ZIP-ready results.', ready: (count, size) => `${count} files selected · ${size} MB total`, running: (done, total) => `Processing ${done} of ${total} files`, complete: (success, total) => `Batch complete: ${success} of ${total} files produced smaller verified PNGs.`,
    tooMany: 'A batch can contain at most 20 files. Remove extra files and try again.', totalTooLarge: 'The selected batch exceeds 100 MB. Remove files and try again.', lowMemory: 'This device reports limited memory, so files will be processed one at a time.', reducedConcurrency: 'Memory pressure was detected. Remaining files are now processed one at a time.', noSuccess: 'No smaller verified PNG was produced, so no ZIP is available.',
    queued: 'Queued', processing: 'Optimizing', optimized: 'Optimized', unchanged: 'No saving', failed: 'Failed', cancelled: 'Cancelled', download: 'Download PNG', original: 'Original', result: 'Result', saved: 'saved', summaryLabel: 'Batch PNG results'
  },
  'zh-cn': {
    heading: '批量 PNG 优化', intro: '在一个本地队列中优化最多 20 个静态 PNG。成功文件可以单独下载，也可以一起下载为 ZIP。', toolLabel: '批量 PNG 无损优化', choose: '选择 PNG 文件', drop: '将 PNG 文件拖到这里', limits: '最多 20 个 · 合计 100 MB · 每个 20 MB',
    start: '开始批量优化 →', cancel: '取消批量任务', retry: '重试失败文件', reset: '清空批量任务', zip: (count) => `将 ${count} 个成功文件下载为 ZIP`, preparingZip: '正在生成 ZIP…',
    idle: '请选择两个或更多 PNG；需要 ZIP 结果时，也可以只选择一个文件。', ready: (count, size) => `已选择 ${count} 个文件 · 合计 ${size} MB`, running: (done, total) => `正在处理第 ${done}/${total} 个文件`, complete: (success, total) => `批量任务完成：${total} 个文件中有 ${success} 个生成了更小且通过校验的 PNG。`,
    tooMany: '每批最多选择 20 个文件。请移除多余文件后重试。', totalTooLarge: '所选文件合计超过 100 MB。请移除部分文件后重试。', lowMemory: '检测到设备内存较低，将改为逐个处理。', reducedConcurrency: '检测到内存压力，剩余文件已改为逐个处理。', noSuccess: '没有生成更小且通过校验的 PNG，因此不能创建 ZIP。',
    queued: '等待处理', processing: '优化中', optimized: '已优化', unchanged: '无需优化', failed: '失败', cancelled: '已取消', download: '下载 PNG', original: '原文件', result: '结果', saved: '已节省', summaryLabel: '批量 PNG 结果'
  },
  'zh-tw': {
    heading: '批次 PNG 最佳化', intro: '在一個本機佇列中最佳化最多 20 個靜態 PNG。成功檔案可以個別下載，也可以一起下載為 ZIP。', toolLabel: '批次 PNG 無損最佳化', choose: '選擇 PNG 檔案', drop: '將 PNG 檔案拖到這裡', limits: '最多 20 個 · 合計 100 MB · 每個 20 MB',
    start: '開始批次最佳化 →', cancel: '取消批次工作', retry: '重試失敗檔案', reset: '清除批次工作', zip: (count) => `將 ${count} 個成功檔案下載為 ZIP`, preparingZip: '正在建立 ZIP…',
    idle: '請選擇兩個或更多 PNG；需要 ZIP 結果時，也可以只選擇一個檔案。', ready: (count, size) => `已選擇 ${count} 個檔案 · 合計 ${size} MB`, running: (done, total) => `正在處理第 ${done}/${total} 個檔案`, complete: (success, total) => `批次工作完成：${total} 個檔案中有 ${success} 個產生較小且通過驗證的 PNG。`,
    tooMany: '每批最多選擇 20 個檔案。請移除多餘檔案後再試一次。', totalTooLarge: '所選檔案合計超過 100 MB。請移除部分檔案後再試一次。', lowMemory: '偵測到裝置記憶體較低，將改為逐一處理。', reducedConcurrency: '偵測到記憶體壓力，剩餘檔案已改為逐一處理。', noSuccess: '沒有產生較小且通過驗證的 PNG，因此無法建立 ZIP。',
    queued: '等候處理', processing: '最佳化中', optimized: '已最佳化', unchanged: '無需最佳化', failed: '失敗', cancelled: '已取消', download: '下載 PNG', original: '原始檔案', result: '結果', saved: '已節省', summaryLabel: '批次 PNG 結果'
  }
};
