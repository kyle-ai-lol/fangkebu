// 多租戶測試：A 房仲的資料，B 房仲讀不到、改不到、刪不到，也掛不上去。
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { admin, anonClient, deleteTestAgents, signUpAgent, type TestAgent } from "./helpers";

let A: TestAgent;
let B: TestAgent;
let aClientId: string;

beforeAll(async () => {
  A = await signUpAgent("a");
  B = await signUpAgent("b");
  const { data, error } = await A.db
    .from("clients")
    .insert({ name: "A 的客人", area: "北區", budget: "8000", phone: "0900-000-001" })
    .select("id")
    .single();
  if (error) throw error;
  aClientId = data.id;
  const log = await A.db.from("client_logs").insert({ client_id: aClientId, text: "A 的紀錄" });
  const viewing = await A.db.from("viewings").insert({ client_id: aClientId, starts_at: "2026-09-22T11:00:00Z", address: "北區示範路 1 號" });
  if (log.error || viewing.error) throw log.error ?? viewing.error;
});

afterAll(deleteTestAgents);

describe("註冊", () => {
  test("註冊後自動建立房仲資料，而且只看得到自己的", async () => {
    const { data } = await A.db.from("agents").select("id, name");
    expect(data).toEqual([{ id: A.id, name: "測試房仲a" }]);
  });

  test("註冊資料格式怪怪的也不會擋住註冊（名字太長會截斷、服務區域不是陣列就留空）", async () => {
    const odd = await signUpAgent("odd", { name: "很".repeat(60), areas: "北區", bot_name: "" });
    const { data } = await odd.db.from("agents").select("name, areas, bot_name").single();
    expect(data).toEqual({ name: "很".repeat(40), areas: [], bot_name: "小幫手" });
  });
});

describe("B 房仲碰不到 A 房仲的資料", () => {
  test("讀不到客人、紀錄、約看", async () => {
    expect((await B.db.from("clients").select("id")).data).toEqual([]);
    expect((await B.db.from("clients").select("id").eq("id", aClientId).maybeSingle()).data).toBeNull();
    expect((await B.db.from("client_logs").select("id")).data).toEqual([]);
    expect((await B.db.from("viewings").select("id")).data).toEqual([]);
  });

  test("讀不到 A 的房仲資料", async () => {
    const { data } = await B.db.from("agents").select("id");
    expect(data).toEqual([{ id: B.id }]);
  });

  test("改不到 A 的客人和房仲資料", async () => {
    const client = await B.db.from("clients").update({ name: "被 B 改掉" }).eq("id", aClientId).select("id");
    expect(client.data).toEqual([]);
    const agent = await B.db.from("agents").update({ name: "被 B 改掉" }).eq("id", A.id).select("id");
    expect(agent.data).toEqual([]);
    const check = await admin.from("clients").select("name").eq("id", aClientId).single();
    expect(check.data?.name).toBe("A 的客人");
    const agentCheck = await admin.from("agents").select("name").eq("id", A.id).single();
    expect(agentCheck.data?.name).toBe("測試房仲a");
  });

  test("刪不到 A 的客人", async () => {
    const del = await B.db.from("clients").delete().eq("id", aClientId).select("id");
    expect(del.data).toEqual([]);
    const check = await admin.from("clients").select("id").eq("id", aClientId);
    expect(check.data).toHaveLength(1);
  });

  test("沒辦法把紀錄、約看掛到 A 的客人底下", async () => {
    // agent_id 預設是 B 自己 → 複合外鍵擋住（A 的客人不屬於 B）
    const log = await B.db.from("client_logs").insert({ client_id: aClientId, text: "B 偷塞的紀錄" });
    expect(log.error).not.toBeNull();
    const viewing = await B.db.from("viewings").insert({ client_id: aClientId, starts_at: "2026-09-22T11:00:00Z", address: "偷塞" });
    expect(viewing.error).not.toBeNull();
    // 冒用 A 的 agent_id → RLS 擋住
    const forged = await B.db.from("client_logs").insert({ client_id: aClientId, agent_id: A.id, text: "冒用 A" });
    expect(forged.error).not.toBeNull();
  });

  test("不能用 A 的名義新增客人，也不能把自己的客人轉給 A", async () => {
    const forged = await B.db.from("clients").insert({ agent_id: A.id, name: "冒用 A" });
    expect(forged.error).not.toBeNull();
    const own = await B.db.from("clients").insert({ name: "B 的客人" }).select("id").single();
    expect(own.error).toBeNull();
    const move = await B.db.from("clients").update({ agent_id: A.id }).eq("id", own.data!.id).select("id");
    expect(move.error).not.toBeNull();
  });

  test("A 自己看得到全部，且 B 剛才的動作都沒有留下東西", async () => {
    const logs = await A.db.from("client_logs").select("text");
    expect(logs.data).toEqual([{ text: "A 的紀錄" }]);
    const viewings = await A.db.from("viewings").select("address");
    expect(viewings.data).toEqual([{ address: "北區示範路 1 號" }]);
  });
});

describe("沒登入", () => {
  test("什麼都讀不到", async () => {
    const anon = anonClient();
    for (const table of ["agents", "clients", "client_logs", "viewings"] as const) {
      const { data } = await anon.from(table).select("id");
      expect(data ?? [], table).toEqual([]);
    }
  });
});

describe("刪除", () => {
  test("刪掉客人，他的紀錄和約看也一起刪掉", async () => {
    const c = await A.db.from("clients").insert({ name: "要刪的客人" }).select("id").single();
    await A.db.from("client_logs").insert({ client_id: c.data!.id, text: "會被刪" });
    await A.db.from("viewings").insert({ client_id: c.data!.id, starts_at: "2026-09-23T11:00:00Z", address: "會被刪" });
    await A.db.from("clients").delete().eq("id", c.data!.id);
    const left = await admin.from("client_logs").select("id").eq("client_id", c.data!.id);
    const leftV = await admin.from("viewings").select("id").eq("client_id", c.data!.id);
    expect([left.data, leftV.data]).toEqual([[], []]);
  });
});
