import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { layoutCopy, publishedLocales } from '../../src/lib/locales.ts';
import { toTraditional } from '../../src/lib/traditionalize-text.ts';

const simplifiedOnly = /[图过标万仅静态当设无达浏览编码处时请尝试读确认损坏备进压缩绪选择须间输节检载败传为后点击实数会画质还吗决于细调许体积减应该广网么难采并适来将这预义单动结离开终获从项场邮带见问题张宽显铺满内区侧顶发现据说变]/u;

test('published language names follow the current interface language', () => {
  assert.deepEqual(publishedLocales, ['en', 'zh-cn', 'zh-tw']);
  assert.equal(layoutCopy.en.localeNames['zh-tw'], 'Traditional Chinese');
  assert.equal(layoutCopy['zh-cn'].localeNames['zh-tw'], '繁体中文');
  assert.equal(layoutCopy['zh-tw'].localeNames['zh-tw'], '繁體中文');
});

test('Traditional Chinese conversion covers active UI and preserves user filenames', () => {
  const filename = '静态图片.png';
  const result = toTraditional(`选择静态图片。铺满并居中裁切。文件：${filename}`, [filename]);
  assert.equal(result, `選擇靜態圖片。填滿並置中裁切。檔案：${filename}`);
  assert.equal(toTraditional('截图、标志和图片'), '螢幕截圖、標誌和圖片');
});

test('authored Chinese tool labels and status messages have no known simplified-only glyphs after conversion', async () => {
  for (const name of ['CompressionTool', 'ResizeTool', 'CropTool', 'ImageInfoTool']) {
    const source = await readFile(new URL(`../../src/components/${name}.tsx`, import.meta.url), 'utf8');
    const literals = [...source.matchAll(/'([^'\n]*[\u3400-\u9fff][^'\n]*)'/gu)].map((match) => match[1]);
    assert.ok(literals.length > 0, `${name} should contain Chinese copy`);
    for (const literal of literals) assert.doesNotMatch(toTraditional(literal), simplifiedOnly, `${name}: ${literal}`);
  }
});
