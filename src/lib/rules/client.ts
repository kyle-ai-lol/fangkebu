// 客戶卡的欄位、階段，以及規則函式共用的型別。

import { parseBudget } from "./budget";
import { detectDistricts, districtShort } from "./districts";

export const FIELD_DEFS = [
  { key: "people", n: 1, label: "入住人數", short: "人數", placeholder: "例：1 人" },
  { key: "moveIn", n: 2, label: "最快入住時間", short: "入住時間", placeholder: "例：10/15、月底" },
  { key: "job", n: 3, label: "職業身份", short: "職業", placeholder: "例：學生、工程師" },
  { key: "smoke", n: 4, label: "有無抽菸", short: "抽菸", placeholder: "有／無" },
  { key: "pet", n: 5, label: "有無寵物", short: "寵物", placeholder: "例：一隻貓" },
  { key: "phone", n: 6, label: "電話號碼", short: "電話", placeholder: "09xx-xxx-xxx" },
  { key: "gender", n: 7, label: "性別", short: "性別", placeholder: "" },
  { key: "age", n: 8, label: "年齡", short: "年齡", placeholder: "" },
  { key: "area", n: 9, label: "希望居住行政區或學校／公司", short: "地區", placeholder: "例：北區，或學校全名" },
  { key: "budget", n: 10, label: "預算金額", short: "預算", placeholder: "例：8000" },
  { key: "transport", n: 11, label: "交通工具", short: "交通", placeholder: "例：機車" },
  { key: "commute", n: 12, label: "騎車幾分鐘到第 9 項地點", short: "通勤時間", placeholder: "例：10 分鐘" },
] as const;

export type FieldDef = (typeof FIELD_DEFS)[number];
export type FieldKey = FieldDef["key"];
export type ClientFields = Record<FieldKey, string>;

export const STAGES = ["新詢問", "資料蒐集中", "待推薦", "已約看", "斡旋中", "已成交", "暫停"] as const;
export type Stage = (typeof STAGES)[number];
/** 已成交、暫停算結案 */
export const CLOSED_STAGES: readonly Stage[] = ["已成交", "暫停"];

export function isClosed(stage: Stage): boolean {
  return CLOSED_STAGES.includes(stage);
}

/** 規則函式需要的客戶資料（資料庫的 12 項欄位可能是 null） */
export interface Client {
  id: string;
  agentId: string;
  /** 原本稱呼，例如 LINE 暱稱 */
  name: string;
  fields: Partial<Record<FieldKey, string | null>>;
  /** 最快入住日 YYYY-MM-DD */
  moveInDate: string | null;
  /** 現租約到期日 YYYY-MM-DD */
  leaseEnd: string | null;
  isStudent: boolean;
  needsSubsidy: boolean;
  stage: Stage;
  /** AI 轉交給房仲本人的問題 */
  handoffQuestion: string | null;
  /** ISO 時間 */
  createdAt: string;
  updatedAt: string;
}

export interface Viewing {
  id: string;
  clientId: string;
  /** ISO 時間（資料庫的 timestamptz） */
  startsAt: string;
  address: string;
}

export function emptyFields(): ClientFields {
  return Object.fromEntries(FIELD_DEFS.map((f) => [f.key, ""])) as ClientFields;
}

/** 取欄位值（去掉前後空白，null 當空字串） */
export function fieldValue(c: Pick<Client, "fields">, k: FieldKey): string {
  return String(c.fields?.[k] ?? "").trim();
}

/** 12 項裡還缺哪幾項 */
export function missingFields(c: Pick<Client, "fields">): FieldDef[] {
  return FIELD_DEFS.filter((f) => !fieldValue(c, f.key));
}

/** 職業寫了「學生」就當學生（租約提醒提前 15 天） */
export function isStudentJob(job: string | null | undefined): boolean {
  return /學生/.test(job ?? "");
}

/** 客戶簿列表上那一行條件摘要 */
export function summary(c: Pick<Client, "fields">): string {
  const parts: string[] = [];
  const area = fieldValue(c, "area");
  const ds = detectDistricts(area);
  if (ds.length) parts.push(ds.map(districtShort).join("、"));
  else if (area) parts.push(area);
  const b = parseBudget(fieldValue(c, "budget"));
  if (b) parts.push(`${b.toLocaleString("zh-TW")} 元`);
  if (fieldValue(c, "people")) parts.push(fieldValue(c, "people"));
  if (fieldValue(c, "moveIn")) parts.push(`${fieldValue(c, "moveIn")} 入住`);
  const pet = fieldValue(c, "pet");
  if (pet && !/^(無|沒有|否|不)$/.test(pet)) parts.push(`寵物：${pet}`);
  return parts.join("，") || "條件還沒問";
}
