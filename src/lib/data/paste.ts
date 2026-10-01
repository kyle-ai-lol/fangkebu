// 貼上整理的資料庫動作：查同一支電話的客人、存成新客戶、補進舊客戶卡。
// 刻意不放在 "use server" 檔案裡：那種檔案匯出的函式都能被瀏覽器直接呼叫。
// 都吃傳進來的連線，所以能用不同房仲的登入狀態直接測（tests/db/paste.test.ts）。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesUpdate } from "../db/database.types";
import { fieldsToColumns, toClient, type ClientInsert } from "../db/mappers";
import {
  computeAliases, displayName, findSamePhone, mergeDraft, mergeLogTexts, newClientLogTexts, pasteClientName,
  samePhone, stageForDraft, type PasteDraft, type Stage, type Ymd,
} from "../rules";
import { logRows } from "./log-rows";

type Db = SupabaseClient<Database>;

/** 追蹤紀錄一筆最多 2000 字（資料庫限制） */
const LOG_MAX = 2000;

export interface PasteMatch {
  id: string;
  alias: string;
  stage: Stage;
}

export type PasteWriteResult =
  | { ok: true; clientId: string; filled: number }
  | { ok: false; error: "not_found" | "phone_mismatch" | "db"; code?: string };

/**
 * 客戶簿裡和這支電話相同的客人（只比電話，不比名字）。
 * RLS 只回傳這位房仲自己的客戶，所以對不到別的房仲的客人。
 */
export async function loadPasteMatches(supabase: Db, phone: string, today: Ymd): Promise<PasteMatch[]> {
  // 沒電話或號碼太短（少於 8 碼）：不提示合併，也不用查
  if (!samePhone(phone, phone)) return [];
  const { data, error } = await supabase.from("clients").select("*").order("created_at");
  if (error) throw new Error(`讀取客戶失敗（${error.code}）`);
  const all = data.map(toClient);
  const aliases = computeAliases(all, today);
  return findSamePhone(all, phone).map((c) => ({ id: c.id, alias: displayName(aliases.get(c.id)), stage: c.stage }));
}

async function writeLogs(supabase: Db, agentId: string, clientId: string, texts: string[]) {
  const { error } = await supabase.from("client_logs").insert(logRows(agentId, clientId, texts.map((t) => t.slice(0, LOG_MAX))));
  // 客戶資料已經存好了，紀錄寫失敗不擋流程；log 只記錯誤代碼
  if (error) console.error("paste log insert failed", error.code);
}

/** 整理結果存成一張新客戶卡 */
export async function insertPasteClient(supabase: Db, agentId: string, draft: PasteDraft, now: Date = new Date()): Promise<PasteWriteResult> {
  const row: ClientInsert = {
    ...fieldsToColumns(draft.fields),
    agent_id: agentId,
    name: pasteClientName(draft, now),
    stage: stageForDraft(draft),
    source: "貼上整理",
    move_in_date: draft.moveInDate,
    lease_end: draft.leaseEnd,
    is_student: draft.isStudent,
    needs_subsidy: draft.needsSubsidy,
  };
  const { data, error } = await supabase.from("clients").insert(row).select("id").single();
  if (error) return { ok: false, error: "db", code: error.code };
  await writeLogs(supabase, agentId, data.id, newClientLogTexts(draft.summary));
  return { ok: true, clientId: data.id, filled: 0 };
}

/**
 * 整理結果補進舊客戶卡：只填空白欄位，原本有值的不動。
 * clientId 是瀏覽器傳來的，不能直接相信：讀不到（別人的客戶）或電話不同，一律拒絕。
 */
export async function mergePasteIntoClient(supabase: Db, agentId: string, clientId: string, draft: PasteDraft): Promise<PasteWriteResult> {
  const { data: row, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (error) return { ok: false, error: "db", code: error.code };
  if (!row) return { ok: false, error: "not_found" };
  if (!samePhone(draft.fields.phone, row.phone)) return { ok: false, error: "phone_mismatch" };

  const m = mergeDraft(toClient(row), draft);
  const patch: TablesUpdate<"clients"> = { ...fieldsToColumns(m.fields) };
  if (m.moveInDate) patch.move_in_date = m.moveInDate;
  if (m.leaseEnd) patch.lease_end = m.leaseEnd;
  if (m.isStudent) patch.is_student = true;
  if (m.needsSubsidy) patch.needs_subsidy = true;
  // 沒有東西要補也更新 updated_at：有新對話就算有進度（提醒「3 天沒更新」用；觸發器會填成現在時間）
  if (Object.keys(patch).length === 0) patch.updated_at = new Date().toISOString();

  const upd = await supabase.from("clients").update(patch).eq("id", clientId).select("id");
  if (upd.error) return { ok: false, error: "db", code: upd.error.code };
  if (upd.data.length === 0) return { ok: false, error: "not_found" };
  await writeLogs(supabase, agentId, clientId, mergeLogTexts(m, draft.summary));
  return { ok: true, clientId, filled: m.filled };
}
