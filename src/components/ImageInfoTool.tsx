import { useState } from 'react';
import { traditionalize } from '../lib/traditionalize';
import { ImageValidationError, validateImageFile } from '../lib/image/file-validation';
import { getJpegMetadata, getPngMetadata, getWebpMetadata } from '../lib/image/metadata';

type Info = { name: string; format: string; bytes: number; width: number; height: number; ratio: string; alpha: string; dpi: string; orientation: string };

export default function ImageInfoTool({ mode, locale = 'en' }: { mode: 'size' | 'dpi'; locale?: 'en' | 'zh-cn' | 'zh-tw' }) {
  const zh = locale !== 'en';
  const [info, setInfo] = useState<Info | null>(null); const [status, setStatus] = useState(zh ? '选择静态图片。处理仅在本设备进行。' : 'Choose a static image. Processing stays on this device.');
  const inspect = async (file?: File) => {
    if (!file) return;
    if (file.size > 20_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setStatus(zh ? '请选择 20 MB 以内的静态 JPEG、PNG 或 WebP 图片。' : 'Use a static JPEG, PNG, or WebP image up to 20 MB.'); setInfo(null); return; }
    try {
      await validateImageFile(file);
      const [bitmap, buffer] = await Promise.all([createImageBitmap(file), file.arrayBuffer()]);
      if (bitmap.width * bitmap.height > 40_000_000) { bitmap.close(); setStatus(zh ? '图片超过 4000 万像素限制。' : 'Images over 40 megapixels are not supported.'); setInfo(null); return; }
      const bytes = new Uint8Array(buffer); let dpi = 0; let orientation = 1; let alpha = 'Not indicated';
      if (file.type === 'image/jpeg') { const metadata = getJpegMetadata(bytes); dpi = metadata.dpi; orientation = metadata.orientation; alpha = zh ? '否' : 'No'; }
      if (file.type === 'image/png') { const metadata = getPngMetadata(bytes); dpi = metadata.dpi; alpha = metadata.alpha ? (zh ? '是（支持透明背景）' : 'Yes (PNG supports transparency)') : (zh ? '未发现透明通道' : 'No alpha channel indicated'); }
      if (file.type === 'image/webp') { const metadata = getWebpMetadata(bytes); alpha = metadata.alpha ? (zh ? '是（WebP 透明通道）' : 'Yes (WebP alpha channel)') : (zh ? '未发现透明通道' : 'No alpha channel indicated'); }
      const width = orientation >= 5 && orientation <= 8 ? bitmap.height : bitmap.width; const height = orientation >= 5 && orientation <= 8 ? bitmap.width : bitmap.height; bitmap.close();
      setInfo({ name: file.name, format: file.type.split('/')[1].toUpperCase(), bytes: file.size, width, height, ratio: `${(width / height).toFixed(3)}:1`, alpha, dpi: dpi ? `${dpi} × ${dpi} DPI` : (zh ? '未嵌入' : 'Not embedded'), orientation: `${orientation}` }); setStatus(zh ? '检查完成。' : 'Inspection complete.');
    } catch (error) { setStatus(error instanceof ImageValidationError && error.code === 'ANIMATION_UNSUPPORTED' ? (zh ? '不支持动态图片。请先导出静态画面。' : 'Animated images are not supported. Export a still frame first.') : (zh ? '无法检查这张图片。' : 'This image could not be inspected.')); setInfo(null); }
  };
  const noDpi = zh ? '未在支持的元数据字段中找到 DPI。像素尺寸本身无法确定打印尺寸。' : 'No supported DPI metadata was found. Pixel dimensions do not determine print size by themselves.';
  const sizeDetails = info ? (zh ? [['文件', info.name], ['格式', info.format], ['文件大小', `${info.bytes.toLocaleString()} 字节 · ${(info.bytes / 1000).toFixed(2)} KB · ${(info.bytes / 1024).toFixed(2)} KiB`], ['像素尺寸', `${info.width} × ${info.height}px`], ['宽高比', info.ratio], ['透明度', info.alpha]] : [['File', info.name], ['Format', info.format], ['File size', `${info.bytes.toLocaleString()} bytes · ${(info.bytes / 1000).toFixed(2)} KB · ${(info.bytes / 1024).toFixed(2)} KiB`], ['Dimensions', `${info.width} × ${info.height}px`], ['Aspect ratio', info.ratio], ['Transparency', info.alpha]]) : [];
  const dpiDetails = info ? (zh ? [['文件', info.name], ['格式', info.format], ['分辨率', info.dpi], ['像素尺寸', `${info.width} × ${info.height}px`], ['EXIF 方向', info.orientation], ['DPI 说明', info.dpi === '未嵌入' ? noDpi : 'DPI 是元数据，不会改变图片的像素尺寸。']] : [['File', info.name], ['Format', info.format], ['Resolution', info.dpi], ['Pixel dimensions', `${info.width} × ${info.height}px`], ['EXIF orientation', info.orientation], ['DPI note', info.dpi === 'Not embedded' ? noDpi : 'DPI is metadata; it does not change the pixel dimensions.']]) : [];
  const content = <section className="info-tool" aria-label={mode === 'size' ? (zh ? '图片大小检查' : 'Image size checker') : (zh ? '图片 DPI 检查' : 'Image DPI checker')}><label className="info-upload">{zh ? '选择图片' : 'Choose image'}<input type="file" aria-label={zh ? '选择要检查的图片' : 'Choose an image to inspect'} accept="image/jpeg,image/png,image/webp" onChange={(event) => inspect(event.target.files?.[0])} /></label><p className="status" role="status" aria-live="polite">{status}</p>{info && <div className="info-grid">{(mode === 'size' ? sizeDetails : dpiDetails).map(([label, value]) => <div className="info-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}</section>;
  return locale === 'zh-tw' ? traditionalize(content, info ? [info.name] : []) : content;
}
