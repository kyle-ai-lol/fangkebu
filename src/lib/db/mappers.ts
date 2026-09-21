// 資料庫的一列 ↔ 規則函式用的資料。
import type { Tables, TablesInsert } from "./database.types";
import { FIELD_DEFS, type Client, type FieldKey, type Viewing } from "../rules";

export type AgentRow = Tables<"agents">;
export type ClientRow = Tables<"clients">;
export type ClientInsert = TablesInsert<"clients">;
export type LogRow = Tables<"client_logs">;
export type ViewingRow = Tables<"viewings">;

/** 12 項欄位對應的資料庫欄位 */
export const FIELD_COLUMN = {
  people: "people",
  moveIn: "move_in",
  job: "job",
  smoke: "smoke",
  pet: "pet",
  phone: "phone",
  gender: "gender",
  age: "age",
  area: "area",
  budget: "budget",
  transport: "transport",
  commute: "commute",
} as const satisfies Record<FieldKey, keyof ClientRow>;

export function toClient(r: ClientRow): Client {
  return {
    id: r.id,
    agentId: r.agent_id,
    name: r.name,
    fields: Object.fromEntries(FIELD_DEFS.map((f) => [f.key, r[FIELD_COLUMN[f.key]]])),
    moveInDate: r.move_in_date,
    leaseEnd: r.lease_end,
    isStudent: r.is_student,
    needsSubsidy: r.needs_subsidy,
    stage: r.stage,
    handoffQuestion: r.handoff_question,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toViewing(r: ViewingRow): Viewing {
  return { id: r.id, clientId: r.client_id, startsAt: r.starts_at, address: r.address };
}

/** 規則函式的 12 項欄位 → 要寫進資料庫的欄位 */
export function fieldsToColumns(fields: Partial<Record<FieldKey, string>>): Partial<ClientInsert> {
  const out: Partial<ClientInsert> = {};
  for (const [k, v] of Object.entries(fields) as [FieldKey, string][]) out[FIELD_COLUMN[k]] = v;
  return out;
}
