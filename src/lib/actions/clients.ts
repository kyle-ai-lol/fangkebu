"use server";
// 客戶卡的所有修改。每個動作都用房仲自己的登入狀態連資料庫，RLS 保證只動得到自己的資料。
// log 只記錯誤代碼：資料庫的錯誤細節可能含客人電話。

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TablesUpdate } from "@/lib/db/database.types";
import { FIELD_COLUMN, toClient } from "@/lib/db/mappers";
import { replaceDemoClients } from "@/lib/data/demo-insert";
import { computeAliases, displayName, isStudentJob, onViewingAdded, todayInTaipei } from "@/lib/rules";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { fieldUpdateSchema, firstError, idSchema, logSchema, metaUpdateSchema, viewingSchema } from "@/lib/validation";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function session() {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");
  return { supabase, userId };
}

function done(message?: string): ActionResult {
  revalidatePath("/app", "layout");
  return { ok: true, message };
}

function failed(what: string, code?: string): ActionResult {
  console.error(`${what} failed`, code);
  return { ok: false, error: `${what}失敗，請再試一次。` };
}

/** 更新 updated_at（提醒「3 天沒更新」用；觸發器會填成現在時間） */
async function touch(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string) {
  await supabase.from("clients").update({ updated_at: new Date().toISOString() }).eq("id", clientId);
}

/** 同時寫好幾筆紀錄時，時間錯開 1 毫秒，列表順序才固定 */
function logRows(agentId: string, clientId: string, texts: string[]) {
  const base = Date.now();
  return texts.map((text, i) => ({ agent_id: agentId, client_id: clientId, text, created_at: new Date(base + i).toISOString() }));
}

export async function newClientAction(): Promise<void> {
  const { supabase, userId } = await session();
  const { data, error } = await supabase.from("clients").insert({ agent_id: userId, source: "手動" }).select("id").single();
  if (error) throw new Error(`新增客戶失敗（${error.code}）`);
  await supabase.from("client_logs").insert(logRows(userId, data.id, ["建立客戶卡（手動）"]));
  revalidatePath("/app", "layout");
  redirect(`/app/clients?open=${data.id}`);
}

export async function updateFieldAction(input: { clientId: string; key: string; value: string }): Promise<ActionResult> {
  const p = fieldUpdateSchema.safeParse(input);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const { clientId, key, value } = p.data;
  const { supabase } = await session();

  const patch: TablesUpdate<"clients"> = { [FIELD_COLUMN[key]]: value };
  if (key === "job" && isStudentJob(value)) patch.is_student = true;
  const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
  if (error) return failed("儲存", error.code);

  let message: string | undefined;
  const digits = value.replace(/\D/g, "");
  if (key === "phone" && digits.length >= 8) {
    const { data: rows } = await supabase.from("clients").select("*");
    const all = (rows ?? []).map(toClient);
    const dup = all.find((c) => c.id !== clientId && String(c.fields.phone ?? "").replace(/\D/g, "") === digits);
    if (dup) message = `「${displayName(computeAliases(all, todayInTaipei()).get(dup.id))}」也是這支電話，可能是同一位客人`;
  }
  return done(message);
}

export async function updateMetaAction(clientId: string, change: { key: string; value: unknown }): Promise<ActionResult> {
  const id = idSchema.safeParse(clientId);
  const p = metaUpdateSchema.safeParse(change);
  if (!id.success || !p.success) return { ok: false, error: p.success ? "客戶不存在" : firstError(p.error) };
  const { supabase, userId } = await session();
  const c = p.data;

  if (c.key === "stage") {
    const { data: cur, error } = await supabase.from("clients").select("stage").eq("id", clientId).single();
    if (error) return failed("儲存", error.code);
    if (cur.stage === c.value) return done();
    const upd = await supabase.from("clients").update({ stage: c.value }).eq("id", clientId);
    if (upd.error) return failed("儲存", upd.error.code);
    await supabase.from("client_logs").insert(logRows(userId, clientId, [`階段：${cur.stage} → ${c.value}`]));
    return done();
  }

  const patch: TablesUpdate<"clients"> =
    c.key === "name" ? { name: c.value }
    : c.key === "moveInDate" ? { move_in_date: c.value }
    : c.key === "leaseEnd" ? { lease_end: c.value }
    : c.key === "isStudent" ? { is_student: c.value }
    : { needs_subsidy: c.value };
  const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
  return error ? failed("儲存", error.code) : done();
}

export async function addViewingAction(input: { clientId: string; when: string; address: string }): Promise<ActionResult> {
  const p = viewingSchema.safeParse(input);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const { clientId, when, address } = p.data;
  const { supabase, userId } = await session();

  const { data: client, error } = await supabase.from("clients").select("stage, phone").eq("id", clientId).single();
  if (error) return failed("加入約看", error.code);

  const startsAt = new Date(`${when}:00+08:00`).toISOString();
  const ins = await supabase.from("viewings").insert({ agent_id: userId, client_id: clientId, starts_at: startsAt, address });
  if (ins.error) return failed("加入約看", ins.error.code);

  const next = onViewingAdded(client.stage, { startsAt, address });
  if (next.stage !== client.stage) await supabase.from("clients").update({ stage: next.stage }).eq("id", clientId);
  else await touch(supabase, clientId);
  await supabase.from("client_logs").insert(logRows(userId, clientId, next.logs));

  return done(client.phone.trim() ? undefined : "記得跟客人要電話，再寫進第 6 項");
}

export async function deleteViewingAction(viewingId: string, clientId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(viewingId).success || !idSchema.safeParse(clientId).success) return { ok: false, error: "約看不存在" };
  const { supabase } = await session();
  const { error } = await supabase.from("viewings").delete().eq("id", viewingId).eq("client_id", clientId);
  if (error) return failed("刪除約看", error.code);
  await touch(supabase, clientId);
  return done();
}

export async function addLogAction(input: { clientId: string; text: string }): Promise<ActionResult> {
  const p = logSchema.safeParse(input);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const { supabase, userId } = await session();
  const { error } = await supabase.from("client_logs").insert(logRows(userId, p.data.clientId, [p.data.text]));
  if (error) return failed("新增紀錄", error.code);
  await touch(supabase, p.data.clientId);
  return done();
}

export async function clearHandoffAction(clientId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(clientId).success) return { ok: false, error: "客戶不存在" };
  const { supabase, userId } = await session();
  const { data, error } = await supabase.from("clients").select("handoff_question").eq("id", clientId).single();
  if (error) return failed("儲存", error.code);
  if (!data.handoff_question) return done();
  const upd = await supabase.from("clients").update({ handoff_question: null }).eq("id", clientId);
  if (upd.error) return failed("儲存", upd.error.code);
  await supabase.from("client_logs").insert(logRows(userId, clientId, [`已回覆 AI 轉交的問題：${data.handoff_question}`]));
  return done();
}

export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(clientId).success) return { ok: false, error: "客戶不存在" };
  const { supabase } = await session();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) return failed("刪除", error.code);
  revalidatePath("/app", "layout");
  redirect("/app/clients");
}

export async function loadDemoAction(): Promise<ActionResult> {
  const { supabase, userId } = await session();
  try {
    const n = await replaceDemoClients(supabase, userId);
    return done(`已放入 ${n} 位示範客戶`);
  } catch (e) {
    return failed("放入示範客戶", (e as Error).message);
  }
}
