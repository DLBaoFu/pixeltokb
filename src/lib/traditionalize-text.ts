// Regional wording is applied before character conversion. Preserve any
// user-provided filenames; this map only transforms authored interface copy.
const phrases: Array<[string, string]> = [
  ['文件大小', '檔案大小'], ['文件', '檔案'], ['字节', '位元組'],
  ['本设备', '本裝置'], ['设备', '裝置'], ['本地', '本機'],
  ['自定义', '自訂'], ['设置', '設定'], ['支持', '支援'],
  ['裁剪', '裁切'], ['分辨率', '解析度'], ['宽高比', '長寬比'],
  ['常见问题', '常見問題'], ['信息', '資訊'],
  ['铺满并居中裁切', '填滿並置中裁切'],
  ['适用场景', '適用情境'], ['截图', '螢幕截圖'], ['标志', '標誌'],
];
const pairs = Object.fromEntries(
  '图=圖 压=壓 缩=縮 选=選 择=擇 仅=僅 设=設 备=備 处=處 页=頁 导=導 隐=隱 浅=淺 随=隨 统=統 颜=顏 换=換 语=語 简=簡 体=體 网=網 络=絡 资=資 规=規 检=檢 触=觸 顶=頂 侧=側 宽=寬 态=態 请=請 传=傳 点=點 击=擊 输=輸 载=載 节=節 发=發 现=現 说=說 质=質 调=調 尝=嘗 试=試 败=敗 错=錯 误=誤 读=讀 称=稱 绪=緒 进=進 无=無 过=過 须=須 确=確 认=認 实=實 际=際 标=標 许=許 会=會 将=將 对=對 于=於 这=這 个=個 还=還 为=為 参=參 数=數 结=結 产=產 动=動 联=聯 关=關 们=們 权=權 条=條 骤=驟 显=顯 据=據 应=應 机=機 画=畫 续=續 终=終 后=後 头=頭 软=軟 线=線 边=邊 转=轉 码=碼 盘=盤 开=開 级=級 细=細 录=錄 复=復 当=當 来=來 门=門 万=萬 习=習 时=時 间=間 让=讓 从=從 该=該 视=視 频=頻 长=長 经=經 远=遠 屏=屏 里=裡 预=預 义=義 单=單 浏=瀏 览=覽 获=獲 离=離 项=項 并=並 适=適 达=達 场=場 邮=郵 损=損 编=編 带=帶 见=見 吗=嗎 么=麼 难=難 静=靜 坏=壞 决=決 积=積 减=減 广=廣 采=採 张=張 铺=鋪 满=滿 内=內 区=區 题=題 变=變'.split(' ').map((pair) => pair.split('='))
);
const characterPairs: Record<string, string> = { ...pairs, 问: '問' };

export function toTraditional(text: string, preserve: string[] = []): string {
  const protectedValues = preserve.filter(Boolean);
  let content = text;
  protectedValues.forEach((value, index) => { content = content.replaceAll(value, `__PIXELTOKB_RAW_${index}__`); });
  content = phrases.reduce((value, [source, target]) => value.replaceAll(source, target), content);
  content = content.replace(/[\u3400-\u9fff]/g, (character) => characterPairs[character] ?? character);
  protectedValues.forEach((value, index) => { content = content.replaceAll(`__PIXELTOKB_RAW_${index}__`, value); });
  return content;
}
