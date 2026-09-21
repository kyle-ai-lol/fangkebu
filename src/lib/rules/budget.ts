/** 把「1 萬以內」「1萬5」「8千」「8,000」這類寫法換成數字；看不懂回傳 0 */
export function parseBudget(v: unknown): number {
  const s = String(v ?? "").replace(/,/g, "").replace(/\s+/g, "");
  let m = s.match(/(\d+(?:\.\d+)?)萬(\d)?/);
  if (m) return Math.round(parseFloat(m[1]) * 10000 + (m[2] ? +m[2] * 1000 : 0));
  m = s.match(/(\d+(?:\.\d+)?)[千kK]/);
  if (m) return Math.round(parseFloat(m[1]) * 1000);
  m = s.match(/\d{4,6}/);
  return m ? +m[0] : 0;
}
