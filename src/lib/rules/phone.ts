// 電話比對：只有電話相同才提示「可能是同一位客人」。名字、暱稱、地區相同或相似都不算。

import { fieldValue, type Client } from "./client";

/** 少於 8 碼不比對，免得空白或打到一半的號碼互相對上 */
const MIN_DIGITS = 8;

/** 只留數字；+886／886 開頭換成 0（+886 912-345-678 → 0912345678）。原型沒有這一步。 */
export function phoneDigits(phone: string | null | undefined): string {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (!d.startsWith("886") || d.length < 11) return d;
  const local = d.slice(3);
  return local.startsWith("0") ? local : `0${local}`;
}

/** 兩支電話是不是同一支：去掉符號後完全相同，而且至少 8 碼 */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = phoneDigits(a);
  return x.length >= MIN_DIGITS && x === phoneDigits(b);
}

/** 客戶簿裡用同一支電話的客人（exceptId = 自己，不算）。原型只取第一位，這裡全部列出。 */
export function findSamePhone<T extends Pick<Client, "id" | "fields">>(
  clients: readonly T[],
  phone: string | null | undefined,
  exceptId?: string,
): T[] {
  return clients.filter((c) => c.id !== exceptId && samePhone(phone, fieldValue(c, "phone")));
}

/** 手機號碼統一寫成 09xx-xxx-xxx（和規則模式一樣）；不是手機就照原樣 */
export function formatPhone(phone: string | null | undefined): string {
  const d = phoneDigits(phone);
  return /^09\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}` : String(phone ?? "").trim();
}
