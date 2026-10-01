// 貼上對話整理：整理結果（草稿）→ 存成新客戶卡，或補進同一支電話的舊客戶卡。
// 邏輯移植自原型的 pasteSave()、pasteMerge()，改動處見各函式註解。

import { baseAlias, type Alias } from "./alias";
import { parseBudget } from "./budget";
import { emptyFields, FIELD_DEFS, fieldValue, isStudentJob, missingFields, type Client, type ClientFields, type FieldKey, type Stage } from "./client";
import { fmtStamp, type Ymd } from "./dates";
import type { Extracted } from "./extract";
import { samePhone } from "./phone";

/** 貼上整理一次最多幾個字。超過請房仲分段貼，不會默默截斷。 */
export const PASTE_MAX = 12000;
export const PASTE_TOO_LONG = "對話太長了（最多 12,000 字），請分段貼上";

/** 整理出來、還沒存進客戶簿的結果 */
export interface PasteDraft {
  /** 客人的稱呼；沒抓到是空字串，存檔時補上「LINE 客人 時間」 */
  name: string;
  /** 12 項條件，沒提到的是空字串 */
  fields: ClientFields;
  moveInDate: Ymd | null;
  leaseEnd: Ymd | null;
  isStudent: boolean;
  needsSubsidy: boolean;
  /** 一句話摘要（只有 AI 模式有） */
  summary: string;
}

/** AI 或規則模式抽出來的條件 → 草稿。職業寫了學生就當學生。 */
export function draftFromExtracted(x: Extracted & { name?: string; summary?: string }): PasteDraft {
  const fields = emptyFields();
  for (const f of FIELD_DEFS) fields[f.key] = (x.fields[f.key] ?? "").trim();
  return {
    name: (x.name ?? "").trim(),
    fields,
    moveInDate: x.moveInDate ?? null,
    leaseEnd: x.leaseEnd ?? null,
    isStudent: x.student === true || isStudentJob(fields.job),
    needsSubsidy: x.subsidy === true,
    summary: (x.summary ?? "").trim(),
  };
}

/** 規則模式抓稱呼：對話第一行「10:12 Mia：…」冒號前面的名字；第一行是房仲自己（我）就不取 */
export function guessNameFromChat(text: string): string {
  const m = /^\s*(?:\d{1,2}:\d{2}\s*)?([^\s：:]{1,10})[：:]/.exec(text);
  return m && m[1] !== "我" ? m[1] : "";
}

/** 存成新客戶時的階段：12 項還有缺就「資料蒐集中」，問齊了就「待推薦」 */
export function stageForDraft(draft: Pick<PasteDraft, "fields">): Stage {
  return missingFields(draft).length ? "資料蒐集中" : "待推薦";
}

/** 存成新客戶時的稱呼：沒抓到名字就用「LINE 客人 10/1 15:40」 */
export function pasteClientName(draft: Pick<PasteDraft, "name">, now: Date): string {
  return draft.name || `LINE 客人 ${fmtStamp(now)}`;
}

/** 預覽卡上方的代稱（還沒存進客戶簿，不考慮和別人重複） */
export function draftAlias(draft: PasteDraft, today: Ymd): Alias {
  return baseAlias(
    { id: "", agentId: "", name: draft.name, fields: draft.fields, moveInDate: draft.moveInDate, stage: "新詢問", createdAt: "" },
    today,
  );
}

/** 新客戶卡的追蹤紀錄 */
export function newClientLogTexts(summary: string): string[] {
  return summary ? ["建立客戶卡（貼上整理）", `對話摘要：${summary}`] : ["建立客戶卡（貼上整理）"];
}

export interface MergeConflict {
  /** 欄位名稱，例如「預算」 */
  label: string;
  old: string;
  next: string;
}

export interface MergeResult {
  /** 要補進去的欄位：原本空白、這次有值 */
  fields: Partial<ClientFields>;
  moveInDate?: Ymd;
  leaseEnd?: Ymd;
  /** 學生、租補只會打開，不會關掉 */
  isStudent?: true;
  needsSubsidy?: true;
  /** 補了幾個欄位（12 項加上兩個日期；原型只算 12 項） */
  filled: number;
  /** 兩邊都有值但不一樣：不覆蓋，只記下來讓房仲自己判斷（原型直接略過不提） */
  conflicts: MergeConflict[];
}

/** 同一欄的兩個值算不算一樣：電話看號碼、預算看金額，其他不管空白 */
function sameValue(key: FieldKey, a: string, b: string): boolean {
  if (key === "phone") return a === b || samePhone(a, b);
  if (key === "budget" && parseBudget(a)) return parseBudget(a) === parseBudget(b);
  return a.replace(/\s/g, "") === b.replace(/\s/g, "");
}

const DATE_LABELS = [["moveInDate", "最快入住日"], ["leaseEnd", "租約到期日"]] as const;

/** 把草稿補進舊客戶卡：只填空白的欄位，原本有值的一律不動。 */
export function mergeDraft(
  existing: Pick<Client, "fields" | "moveInDate" | "leaseEnd" | "isStudent" | "needsSubsidy">,
  draft: PasteDraft,
): MergeResult {
  const out: MergeResult = { fields: {}, filled: 0, conflicts: [] };
  for (const f of FIELD_DEFS) {
    const old = fieldValue(existing, f.key);
    const next = (draft.fields[f.key] ?? "").trim();
    if (!next) continue;
    if (!old) {
      out.fields[f.key] = next;
      out.filled++;
    } else if (!sameValue(f.key, old, next)) {
      out.conflicts.push({ label: f.short, old, next });
    }
  }
  for (const [key, label] of DATE_LABELS) {
    const old = existing[key];
    const next = draft[key];
    if (!next) continue;
    if (!old) {
      out[key] = next;
      out.filled++;
    } else if (old !== next) {
      out.conflicts.push({ label, old, next });
    }
  }
  if (draft.isStudent && !existing.isStudent) out.isStudent = true;
  if (draft.needsSubsidy && !existing.needsSubsidy) out.needsSubsidy = true;
  return out;
}

/** 補進舊客戶卡後要寫的追蹤紀錄 */
export function mergeLogTexts(result: Pick<MergeResult, "filled" | "conflicts">, summary: string): string[] {
  const logs = [`貼上對話補了 ${result.filled} 個欄位${summary ? `：${summary}` : ""}`];
  if (result.conflicts.length) {
    logs.push(`和原本不同、沒有覆蓋：${result.conflicts.map((c) => `${c.label} ${c.next}（原本 ${c.old}）`).join("、")}`);
  }
  return logs;
}
