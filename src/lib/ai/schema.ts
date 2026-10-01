// AI 整理對話時只能輸出這個固定結構。伺服器收到後再驗證一次，
// 不合格就整份不用，改跑規則模式（src/lib/rules/extract.ts）。

import { z } from "zod";
import { FIELD_DEFS, formatPhone, isYmd, parseBudget, type ClientFields, type Extracted, type FieldKey } from "../rules";

const fieldShape = Object.fromEntries(FIELD_DEFS.map((f) => [f.key, z.string()])) as Record<FieldKey, z.ZodString>;

/**
 * 每一項都必填：沒提到的文字欄位給空字串，學生／租補沒明說給 null。
 * 這份結構會交給 Anthropic API 限制輸出格式，所以只放型別，日期對不對在下面檢查。
 */
export const aiPasteSchema = z.object({
  /** 客人的稱呼或 LINE 暱稱 */
  customerName: z.string(),
  /** 12 項找房條件 */
  fields: z.object(fieldShape),
  /** 最快入住日 YYYY-MM-DD，不確定給空字串 */
  moveInDate: z.string(),
  /** 客人現在租約的到期日 YYYY-MM-DD，沒提到給空字串 */
  leaseEnd: z.string(),
  student: z.boolean().nullable(),
  subsidy: z.boolean().nullable(),
  /** 一句話摘要 */
  summary: z.string(),
});

export type AiPaste = z.infer<typeof aiPasteSchema>;
export type AiExtracted = Extracted & { name: string; summary: string };

/** 資料庫欄位上限 */
const FIELD_MAX = 100;
const NAME_MAX = 40;
const SUMMARY_MAX = 200;

/** "" → 沒有；有效日期 → 照用；其他 → 不合格 */
function dateOrInvalid(s: string): { ok: true; value?: string } | { ok: false } {
  const t = s.trim();
  if (!t) return { ok: true };
  return isYmd(t) ? { ok: true, value: t } : { ok: false };
}

/**
 * 驗證 AI 的輸出並整理成和規則模式一樣的格式。
 * 結構不對、型別不對、日期不是有效日期 → 回傳 null（呼叫的人改用規則模式）。
 */
export function parseAiPaste(raw: unknown): AiExtracted | null {
  const p = aiPasteSchema.safeParse(raw);
  if (!p.success) return null;
  const moveIn = dateOrInvalid(p.data.moveInDate);
  const lease = dateOrInvalid(p.data.leaseEnd);
  if (!moveIn.ok || !lease.ok) return null;

  const fields: Partial<ClientFields> = {};
  for (const f of FIELD_DEFS) {
    let v = p.data.fields[f.key].trim();
    if (!v) continue;
    if (f.key === "budget") {
      // 只收看得懂的金額（「1 萬以內」→ 10000），看不懂就當沒提到
      const b = parseBudget(v);
      if (!b) continue;
      v = String(b);
    }
    if (f.key === "phone") v = formatPhone(v);
    fields[f.key] = v.slice(0, FIELD_MAX);
  }

  const out: AiExtracted = {
    fields,
    name: p.data.customerName.trim().slice(0, NAME_MAX),
    summary: p.data.summary.trim().slice(0, SUMMARY_MAX),
  };
  if (moveIn.value) out.moveInDate = moveIn.value;
  if (lease.value) out.leaseEnd = lease.value;
  // 有明說才算，和原型一樣只認 true
  if (p.data.student === true) out.student = true;
  if (p.data.subsidy === true) out.subsidy = true;
  return out;
}
