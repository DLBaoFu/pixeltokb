import { useMemo, useState } from 'react';
import { calculateAspectRatio, calculateCompanionDimension } from '../lib/aspect-ratio';
import type { Locale } from '../lib/locales';

type Copy = {
  source: string;
  width: string;
  height: string;
  result: string;
  simplified: string;
  decimal: string;
  orientation: string;
  companion: string;
  enterWidth: string;
  enterHeight: string;
  calculate: string;
  reset: string;
  invalid: string;
  landscape: string;
  portrait: string;
  square: string;
  basedOnWidth: string;
  basedOnHeight: string;
  targetWidth: string;
  targetHeight: string;
  pixels: string;
  rounded: string;
  note: string;
};

const copies: Record<'en' | 'zh-cn' | 'zh-tw', Copy> = {
  en: {
    source: 'Original dimensions', width: 'Width', height: 'Height', result: 'Aspect ratio', simplified: 'Simplified ratio', decimal: 'Decimal ratio', orientation: 'Orientation', companion: 'Calculate a matching side', enterWidth: 'Enter a width', enterHeight: 'Enter a height', calculate: 'Calculate', reset: 'Reset', invalid: 'Enter positive whole-number pixel dimensions.', landscape: 'Landscape', portrait: 'Portrait', square: 'Square', basedOnWidth: 'Known width', basedOnHeight: 'Known height', targetWidth: 'New width', targetHeight: 'New height', pixels: 'px', rounded: 'Rounded to the nearest pixel.', note: 'This calculator only works with numbers in your browser. It does not open, upload, or change an image file.'
  },
  'zh-cn': {
    source: '原始尺寸', width: '宽度', height: '高度', result: '宽高比', simplified: '最简比例', decimal: '小数比例', orientation: '方向', companion: '计算匹配的另一边', enterWidth: '输入宽度', enterHeight: '输入高度', calculate: '计算', reset: '重置', invalid: '请输入正整数像素尺寸。', landscape: '横向', portrait: '纵向', square: '正方形', basedOnWidth: '已知宽度', basedOnHeight: '已知高度', targetWidth: '新宽度', targetHeight: '新高度', pixels: '像素', rounded: '结果已四舍五入到最接近的像素。', note: '此计算器只在浏览器中处理数字，不会打开、上传或修改图片文件。'
  },
  'zh-tw': {
    source: '原始尺寸', width: '寬度', height: '高度', result: '長寬比', simplified: '最簡比例', decimal: '小數比例', orientation: '方向', companion: '計算相符的另一邊', enterWidth: '輸入寬度', enterHeight: '輸入高度', calculate: '計算', reset: '重設', invalid: '請輸入正整數像素尺寸。', landscape: '橫向', portrait: '直向', square: '正方形', basedOnWidth: '已知寬度', basedOnHeight: '已知高度', targetWidth: '新寬度', targetHeight: '新高度', pixels: '像素', rounded: '結果已四捨五入至最接近的像素。', note: '此計算器只會在瀏覽器中處理數字，不會開啟、上傳或修改圖片檔案。'
  }
};

function parsePixel(value: string) {
  if (!/^\d+$/.test(value)) return 0;
  return Number(value);
}

export default function AspectRatioCalculator({ locale = 'en' }: { locale?: Locale }) {
  const language = locale === 'zh-cn' || locale === 'zh-tw' ? locale : 'en';
  const copy = copies[language];
  const [width, setWidth] = useState('1920');
  const [height, setHeight] = useState('1080');
  const [axis, setAxis] = useState<'width' | 'height'>('width');
  const [target, setTarget] = useState('1200');
  const ratio = useMemo(() => calculateAspectRatio(parsePixel(width), parsePixel(height)), [width, height]);
  const companion = useMemo(() => ratio ? calculateCompanionDimension(ratio, axis, parsePixel(target)) : null, [axis, ratio, target]);
  const orientation = ratio ? copy[ratio.orientation] : '';
  const outputLabel = axis === 'width' ? copy.targetHeight : copy.targetWidth;

  const reset = () => {
    setWidth('1920');
    setHeight('1080');
    setAxis('width');
    setTarget('1200');
  };

  return <section className="ratio-calculator cards" aria-labelledby="ratio-calculator-heading">
    <div className="ratio-source">
      <h2 id="ratio-calculator-heading">{copy.source}</h2>
      <div className="ratio-input-grid">
        <label>{copy.width}<input inputMode="numeric" pattern="[0-9]*" value={width} onChange={(event) => setWidth(event.target.value)} aria-describedby="ratio-input-note" /> <span>{copy.pixels}</span></label>
        <label>{copy.height}<input inputMode="numeric" pattern="[0-9]*" value={height} onChange={(event) => setHeight(event.target.value)} aria-describedby="ratio-input-note" /> <span>{copy.pixels}</span></label>
      </div>
      <p id="ratio-input-note" className="ratio-note">{copy.note}</p>
    </div>
    {ratio ? <div className="ratio-result" aria-live="polite">
      <h2>{copy.result}</h2>
      <p className="ratio-hero-value">{ratio.ratioWidth}:{ratio.ratioHeight}</p>
      <dl>
        <div><dt>{copy.simplified}</dt><dd>{ratio.ratioWidth}:{ratio.ratioHeight}</dd></div>
        <div><dt>{copy.decimal}</dt><dd>{ratio.decimal.toFixed(4)}:1</dd></div>
        <div><dt>{copy.orientation}</dt><dd>{orientation}</dd></div>
      </dl>
    </div> : <p className="status error" role="alert">{copy.invalid}</p>}
    <div className="ratio-companion">
      <h2>{copy.companion}</h2>
      <div className="ratio-input-grid ratio-companion-grid">
        <label>{copy.basedOnWidth}<select value={axis} onChange={(event) => setAxis(event.target.value as 'width' | 'height')}><option value="width">{copy.basedOnWidth}</option><option value="height">{copy.basedOnHeight}</option></select></label>
        <label>{axis === 'width' ? copy.targetWidth : copy.targetHeight}<input inputMode="numeric" pattern="[0-9]*" value={target} onChange={(event) => setTarget(event.target.value)} /> <span>{copy.pixels}</span></label>
        <output className="ratio-output" aria-live="polite"><strong>{outputLabel}</strong><span>{companion ? `${companion.toLocaleString()} ${copy.pixels}` : '—'}</span></output>
      </div>
      <p className="ratio-note">{copy.rounded}</p>
    </div>
    <button type="button" className="secondary-action" onClick={reset}>{copy.reset}</button>
  </section>;
}
