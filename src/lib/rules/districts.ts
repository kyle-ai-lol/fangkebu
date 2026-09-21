// 行政區判斷：台中 29 區、學校醫院對照、「學校附近」這種對不到行政區的說法。

export const DISTRICTS = [
  "中區", "東區", "南區", "西區", "北區", "北屯區", "西屯區", "南屯區", "太平區", "大里區",
  "霧峰區", "烏日區", "豐原區", "后里區", "石岡區", "東勢區", "和平區", "新社區", "潭子區", "大雅區",
  "神岡區", "大肚區", "沙鹿區", "龍井區", "梧棲區", "清水區", "大甲區", "外埔區", "大安區",
] as const;

export type District = (typeof DISTRICTS)[number];

/** 這 5 區去掉「區」只剩一個字，所以代稱和比對都用全名 */
const CORE5: readonly District[] = ["中區", "東區", "南區", "西區", "北區"];

/** 常見學校、醫院對應的行政區：客人只講學校名時，也能照行政區取代稱 */
export const LANDMARKS: ReadonlyArray<readonly [RegExp, District]> = [
  [/中國醫/, "北區"],
  [/中山醫/, "南區"],
  [/逢甲/, "西屯區"],
  [/東海大學|東海/, "西屯區"],
  [/靜宜/, "沙鹿區"],
  [/弘光/, "沙鹿區"],
  [/中興大學|興大/, "南區"],
  [/朝陽科/, "霧峰區"],
  [/亞洲大學|亞大/, "霧峰區"],
  [/臺中科技大學|台中科技大學|臺中科大|台中科大/, "北區"],
  [/勤益/, "太平區"],
  [/榮總/, "西屯區"],
  [/修平/, "大里區"],
  [/嶺東/, "南屯區"],
  [/僑光/, "西屯區"],
  [/臺中教育大學|台中教育大學|中教大/, "西區"],
  [/中台科/, "北屯區"],
];

/** 代稱用的區名：中東南西北區用全名，其他去掉「區」（北屯、西屯、大雅…） */
export function districtShort(d: District): string {
  return CORE5.includes(d) ? d : d.replace(/區$/, "");
}

/** 找出文字裡提到的行政區（照出現順序），再補上學校醫院對應的行政區 */
export function detectDistricts(text: string | null | undefined): District[] {
  if (!text) return [];
  const t = String(text);
  const found: { d: District; i: number }[] = [];
  for (const d of DISTRICTS) {
    const i = t.indexOf(districtShort(d));
    if (i >= 0) found.push({ d, i });
  }
  found.sort((a, b) => a.i - b.i);
  const out = found.map((x) => x.d);
  for (const [re, d] of LANDMARKS) {
    if (re.test(t) && !out.includes(d)) out.push(d);
  }
  return out;
}

const INST_RE = /(大學|科大|醫大|學院|專科|高中|國中|中學|醫院|榮總|園區|公司|科學園區|中科)/;

/** 第 9 項只寫「學校附近」「公司附近」，對不到行政區，要追問全名 */
export function isVagueArea(area: string | null | undefined): boolean {
  const a = String(area ?? "");
  return /附近/.test(a) && detectDistricts(a).length === 0 && !INST_RE.test(a.replace(/公司附近/, ""));
}

/** 對不到行政區時，取第一段文字的前 6 個字 */
export function shortPlace(area: string | null | undefined): string {
  return (String(area ?? "").split(/[、,，/\s]/)[0] || "").slice(0, 6);
}
