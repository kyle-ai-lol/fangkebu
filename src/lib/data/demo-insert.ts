// 放入示範客戶（註冊時勾選、客戶簿空白時、設定頁都會用到）。
// 刻意不放在 "use server" 檔案裡：那種檔案匯出的函式都能被瀏覽器直接呼叫。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import { demoClients } from "../demo";
import { todayInTaipei } from "../rules";

/** 先刪掉舊的示範客戶（紀錄、約看會一起刪），再放入 9 位新的。 */
export async function replaceDemoClients(supabase: SupabaseClient<Database>, agentId: string): Promise<number> {
  const now = new Date();
  const demo = demoClients(todayInTaipei(now), now);

  const del = await supabase.from("clients").delete().eq("agent_id", agentId).eq("source", "示範");
  if (del.error) throw new Error(`刪除舊示範客戶失敗（${del.error.code}）`);

  const ins = await supabase
    .from("clients")
    .insert(demo.map((d) => ({ ...d.row, agent_id: agentId })))
    .select("id, created_at");
  if (ins.error) throw new Error(`放入示範客戶失敗（${ins.error.code}）`);

  // 每位示範客戶的建立時間都不同，用它對回是哪一位
  const idAt = new Map(ins.data.map((r) => [Date.parse(r.created_at), r.id]));
  const clientId = (i: number) => idAt.get(Date.parse(demo[i].row.created_at!))!;

  const logs = demo.map((d, i) => ({ agent_id: agentId, client_id: clientId(i), text: "建立客戶卡（示範）", created_at: d.row.created_at }));
  const viewings = demo.flatMap((d, i) =>
    d.viewings.map((v) => ({ agent_id: agentId, client_id: clientId(i), starts_at: v.startsAt, address: v.address })),
  );
  const [l, v] = await Promise.all([
    supabase.from("client_logs").insert(logs),
    supabase.from("viewings").insert(viewings),
  ]);
  if (l.error || v.error) throw new Error(`放入示範客戶的紀錄或約看失敗（${(l.error ?? v.error)!.code}）`);
  return demo.length;
}
