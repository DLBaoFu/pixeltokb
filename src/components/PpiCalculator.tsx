import { useMemo, useState } from 'react';
import { calculatePpi, convertPrintUnit } from '../lib/ppi';
import type { PrintUnit } from '../lib/ppi';
import type { Locale } from '../lib/locales';

type Copy = {
  pixels: string;
  printSize: string;
  width: string;
  height: string;
  unit: string;
  inches: string;
  millimetres: string;
  result: string;
  horizontal: string;
  vertical: string;
  diagonal: string;
  ppi: string;
  matching: string;
  mismatch: string;
  note: string;
  invalid: string;
  reset: string;
  explanation: string;
};

const copies: Record<'en' | 'zh-cn' | 'zh-tw', Copy> = {
  en: {
    pixels: 'Image pixels', printSize: 'Planned print size', width: 'Width', height: 'Height', unit: 'Unit', inches: 'Inches', millimetres: 'Millimetres', result: 'Calculated pixel density', horizontal: 'Horizontal', vertical: 'Vertical', diagonal: 'Diagonal', ppi: 'PPI', matching: 'The pixel and print aspect ratios match.', mismatch: 'The pixel and print aspect ratios do not match. Cropping or a different print size would be needed to make both values equal.', note: 'PPI is a calculation from numbers you enter. It does not read, change, or add DPI metadata to an image file.', invalid: 'Enter positive pixel dimensions and a positive print size.', reset: 'Reset', explanation: 'PPI describes pixels per inch at a chosen print size. It is not the same as embedded DPI metadata, and changing this calculation does not change an image file.'
  },
  'zh-cn': {
    pixels: '图片像素', printSize: '计划打印尺寸', width: '宽度', height: '高度', unit: '单位', inches: '英寸', millimetres: '毫米', result: '计算出的像素密度', horizontal: '横向', vertical: '纵向', diagonal: '对角线', ppi: 'PPI', matching: '图片像素比例与打印尺寸比例一致。', mismatch: '图片像素比例与打印尺寸比例不一致。如需让两项 PPI 相等，需要裁剪图片或调整打印尺寸。', note: 'PPI 根据你输入的数字计算；它不会读取、修改或写入图片文件的 DPI 元数据。', invalid: '请输入正整数像素尺寸和正数打印尺寸。', reset: '重置', explanation: 'PPI 表示在选定打印尺寸下每英寸的像素数。它不同于文件内嵌的 DPI 元数据，修改此计算不会改变图片文件。'
  },
  'zh-tw': {
    pixels: '圖片像素', printSize: '預計列印尺寸', width: '寬度', height: '高度', unit: '單位', inches: '英吋', millimetres: '毫米', result: '計算出的像素密度', horizontal: '橫向', vertical: '直向', diagonal: '對角線', ppi: 'PPI', matching: '圖片像素比例與列印尺寸比例一致。', mismatch: '圖片像素比例與列印尺寸比例不一致。若要讓兩項 PPI 相等，需裁切圖片或調整列印尺寸。', note: 'PPI 依你輸入的數字計算；不會讀取、修改或寫入圖片檔案的 DPI 中繼資料。', invalid: '請輸入正整數像素尺寸和正數列印尺寸。', reset: '重設', explanation: 'PPI 表示在選定列印尺寸下每英吋的像素數。它不同於檔案內嵌的 DPI 中繼資料，修改此計算不會改變圖片檔案。'
  }
};

function parsePixel(value: string) { return /^\d+$/.test(value) ? Number(value) : 0; }
function parseSize(value: string) { return /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : 0; }
function format(value: number) { return value.toLocaleString(undefined, { maximumFractionDigits: 2 }); }

export default function PpiCalculator({ locale = 'en' }: { locale?: Locale }) {
  const language = locale === 'zh-cn' || locale === 'zh-tw' ? locale : 'en';
  const copy = copies[language];
  const [pixelWidth, setPixelWidth] = useState('3000');
  const [pixelHeight, setPixelHeight] = useState('2000');
  const [printWidth, setPrintWidth] = useState('10');
  const [printHeight, setPrintHeight] = useState('6.6667');
  const [unit, setUnit] = useState<PrintUnit>('in');
  const calculation = useMemo(() => calculatePpi(parsePixel(pixelWidth), parsePixel(pixelHeight), parseSize(printWidth), parseSize(printHeight), unit), [pixelWidth, pixelHeight, printWidth, printHeight, unit]);

  const updateUnit = (nextUnit: PrintUnit) => {
    if (nextUnit === unit) return;
    const nextWidth = convertPrintUnit(parseSize(printWidth), unit, nextUnit);
    const nextHeight = convertPrintUnit(parseSize(printHeight), unit, nextUnit);
    if (nextWidth) setPrintWidth(String(Number(nextWidth.toFixed(4))));
    if (nextHeight) setPrintHeight(String(Number(nextHeight.toFixed(4))));
    setUnit(nextUnit);
  };

  const reset = () => {
    setPixelWidth('3000'); setPixelHeight('2000'); setPrintWidth('10'); setPrintHeight('6.6667'); setUnit('in');
  };

  return <section className="ppi-calculator cards" aria-labelledby="ppi-calculator-heading">
    <div className="ppi-input-section">
      <h2 id="ppi-calculator-heading">{copy.pixels}</h2>
      <div className="ppi-input-grid">
        <label>{copy.width}<input inputMode="numeric" pattern="[0-9]*" value={pixelWidth} onChange={(event) => setPixelWidth(event.target.value)} /> <span>px</span></label>
        <label>{copy.height}<input inputMode="numeric" pattern="[0-9]*" value={pixelHeight} onChange={(event) => setPixelHeight(event.target.value)} /> <span>px</span></label>
      </div>
    </div>
    <div className="ppi-input-section">
      <h2>{copy.printSize}</h2>
      <div className="ppi-input-grid ppi-print-grid">
        <label>{copy.width}<input inputMode="decimal" value={printWidth} onChange={(event) => setPrintWidth(event.target.value)} /> <span>{unit}</span></label>
        <label>{copy.height}<input inputMode="decimal" value={printHeight} onChange={(event) => setPrintHeight(event.target.value)} /> <span>{unit}</span></label>
        <label>{copy.unit}<select value={unit} onChange={(event) => updateUnit(event.target.value as PrintUnit)}><option value="in">{copy.inches}</option><option value="mm">{copy.millimetres}</option></select></label>
      </div>
      <p className="ppi-note">{copy.note}</p>
    </div>
    {calculation ? <div className="ppi-result" aria-live="polite">
      <h2>{copy.result}</h2>
      <dl>
        <div><dt>{copy.horizontal}</dt><dd>{format(calculation.horizontal)} <span>{copy.ppi}</span></dd></div>
        <div><dt>{copy.vertical}</dt><dd>{format(calculation.vertical)} <span>{copy.ppi}</span></dd></div>
        <div><dt>{copy.diagonal}</dt><dd>{format(calculation.diagonal)} <span>{copy.ppi}</span></dd></div>
      </dl>
      <p className={calculation.dimensionsMatch ? 'status success' : 'status error'}>{calculation.dimensionsMatch ? copy.matching : copy.mismatch}</p>
    </div> : <p className="status error" role="alert">{copy.invalid}</p>}
    <p className="ppi-note ppi-explanation">{copy.explanation}</p>
    <button type="button" className="secondary-action" onClick={reset}>{copy.reset}</button>
  </section>;
}
