// 日期工具。「今天」一律用台灣時間算：正式版跑在 UTC 的伺服器上，
// 直接用 new Date() 的年月日，台灣凌晨 0～8 點會算成前一天。
// 台灣沒有日光節約時間，固定 UTC+8。

/** YYYY-MM-DD */
export type Ymd = string;

const DAY_MS = 86_400_000;
const TAIPEI_OFFSET_MS = 8 * 3_600_000;
const WEEKDAYS = "日一二三四五六";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function utcYmd(d: Date): Ymd {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** 'YYYY-MM-DD' → 從 1970-01-01 起算第幾天；格式不對或沒有這天（例 2/30）回傳 null */
function dayNumber(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return t / DAY_MS;
}

/** 某個時間點在台灣是幾月幾號、幾點幾分、星期幾（0 = 星期日） */
export function toTaipei(instant: Date | string | number): { ymd: Ymd; hm: string; weekday: number } {
  const d = new Date(new Date(instant).getTime() + TAIPEI_OFFSET_MS);
  return {
    ymd: utcYmd(d),
    hm: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
    weekday: d.getUTCDay(),
  };
}

/** 台灣的今天 */
export function todayInTaipei(now: Date = new Date()): Ymd {
  return toTaipei(now).ymd;
}

export function isYmd(s: unknown): s is Ymd {
  return typeof s === "string" && dayNumber(s) !== null;
}

/** 從 from 到 to 差幾天（to 比較晚就是正數）；日期無效回傳 null */
export function daysBetween(from: Ymd, to: Ymd): number | null {
  const a = dayNumber(from);
  const b = dayNumber(to);
  return a === null || b === null ? null : b - a;
}

export function addDays(ymd: Ymd, n: number): Ymd {
  const base = dayNumber(ymd);
  if (base === null) throw new Error(`不是有效的日期：${ymd}`);
  return utcYmd(new Date((base + n) * DAY_MS));
}

/** 2026-09-05 → 9/5 */
export function fmtMD(ymd: Ymd): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? `${+m[2]}/${+m[3]}` : "";
}

/** 約看時間 → 9/20（日）19:00 */
export function fmtWhen(instant: Date | string): string {
  const t = toTaipei(instant);
  return `${fmtMD(t.ymd)}（${WEEKDAYS[t.weekday]}）${t.hm}`;
}

/**
 * 客人只講「10/31」這種月日時，推算是哪一年：
 * 算出來比今天早 60 天以上，就當成明年。日期超出月底會往後進位（2/30 → 3/2），和原型一樣。
 */
export function mdToYmd(month: number, day: number | undefined, today: Ymd): Ymd {
  const year = +today.slice(0, 4);
  const onYear = (y: number) => utcYmd(new Date(Date.UTC(y, month - 1, day || 1)));
  const thisYear = onYear(year);
  const diff = daysBetween(today, thisYear);
  return diff !== null && diff <= -60 ? onYear(year + 1) : thisYear;
}

/** 追蹤紀錄的時間 → 9/19 14:05（台灣時間） */
export function fmtStamp(instant: Date | string): string {
  const t = toTaipei(instant);
  return `${fmtMD(t.ymd)} ${t.hm}`;
}

/** 客戶簿「更新」欄：今天、昨天、3 天前 */
export function agoLabel(instant: Date | string, now: Date): string {
  const d = Math.floor((now.getTime() - new Date(instant).getTime()) / DAY_MS);
  return d <= 0 ? "今天" : d === 1 ? "昨天" : `${d} 天前`;
}
