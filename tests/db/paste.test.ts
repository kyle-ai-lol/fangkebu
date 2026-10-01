// 貼上整理的資料庫測試：存成新客戶、同電話才對得到、補進舊客戶卡只填空白。
// 多租戶：B 房仲貼上和 A 客戶同一支電話的對話，對不到 A 的客人，也補不進 A 的客戶卡。
// 這裡不會呼叫 AI（只測存檔那一段）。
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { insertPasteClient, loadPasteMatches, mergePasteIntoClient } from "../../src/lib/data/paste";
import { emptyFields, todayInTaipei, type PasteDraft } from "../../src/lib/rules";
import { admin, deleteTestAgents, signUpAgent, type TestAgent } from "./helpers";

const today = todayInTaipei();

function draft(p: Partial<Omit<PasteDraft, "fields">> & { fields?: Partial<PasteDraft["fields"]> } = {}): PasteDraft {
  return {
    name: "", moveInDate: null, leaseEnd: null, isStudent: false, needsSubsidy: false, summary: "",
    ...p,
    fields: { ...emptyFields(), ...p.fields },
  };
}

async function logsOf(clientId: string): Promise<string[]> {
  const { data } = await admin.from("client_logs").select("text").eq("client_id", clientId).order("created_at");
  return (data ?? []).map((l) => l.text);
}

async function rowOf(clientId: string) {
  const { data, error } = await admin.from("clients").select("*").eq("id", clientId).single();
  if (error) throw error;
  return data;
}

let A: TestAgent;
let B: TestAgent;
let miaId: string;

beforeAll(async () => {
  A = await signUpAgent("paste-a");
  B = await signUpAgent("paste-b");
});

afterAll(deleteTestAgents);

describe("存成新客戶", () => {
  test("來源是「貼上整理」，階段、稱呼、日期、紀錄都寫好", async () => {
    const r = await insertPasteClient(
      A.db, A.id,
      draft({
        name: "Mia", leaseEnd: "2026-10-31", summary: "想找西屯 1 萬以內的套房",
        fields: { area: "西屯、台中榮總", budget: "10000", phone: "0900-000-777", people: "1 人" },
      }),
    );
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    miaId = r.clientId;
    expect(await rowOf(miaId)).toMatchObject({
      agent_id: A.id, name: "Mia", source: "貼上整理", stage: "資料蒐集中",
      area: "西屯、台中榮總", budget: "10000", phone: "0900-000-777", people: "1 人", gender: "",
      lease_end: "2026-10-31", move_in_date: null, is_student: false, needs_subsidy: false,
    });
    expect(await logsOf(miaId)).toEqual(["建立客戶卡（貼上整理）", "對話摘要：想找西屯 1 萬以內的套房"]);
  });

  test("沒抓到稱呼 → LINE 客人＋時間；職業是學生 → 標成學生", async () => {
    const r = await insertPasteClient(A.db, A.id, draft({ isStudent: true, fields: { job: "學生" } }), new Date("2026-09-19T10:00:00+08:00"));
    if (!r.ok) throw new Error(r.error);
    expect(await rowOf(r.clientId)).toMatchObject({ name: "LINE 客人 9/19 10:00", is_student: true, job: "學生" });
    expect(await logsOf(r.clientId)).toEqual(["建立客戶卡（貼上整理）"]);
  });
});

describe("只有電話相同才對得到", () => {
  test("A 自己：同一支電話對得到，寫法不同也算", async () => {
    const expected = [{ id: miaId, alias: "未西屯10000", stage: "資料蒐集中" }];
    expect(await loadPasteMatches(A.db, "0900-000-777", today)).toEqual(expected);
    expect(await loadPasteMatches(A.db, "0900000777", today)).toEqual(expected);
    expect(await loadPasteMatches(A.db, "+886 900 000 777", today)).toEqual(expected);
  });

  test("名字一樣但電話不同 → 對不到；沒電話 → 對不到", async () => {
    const other = await insertPasteClient(A.db, A.id, draft({ name: "Mia", fields: { phone: "0900-000-778", area: "北區", budget: "8000" } }));
    if (!other.ok) throw new Error(other.error);
    const matches = await loadPasteMatches(A.db, "0900-000-777", today);
    expect(matches.map((m) => m.id)).toEqual([miaId]);
    expect(await loadPasteMatches(A.db, "", today)).toEqual([]);
    expect(await loadPasteMatches(A.db, "0900-000-779", today)).toEqual([]);
  });

  test("B 房仲貼上同一支電話 → 對不到 A 的客人", async () => {
    expect(await loadPasteMatches(B.db, "0900-000-777", today)).toEqual([]);
  });
});

describe("補進舊客戶卡", () => {
  test("B 房仲指定補進 A 的客戶卡 → 拒絕，A 的資料和紀錄都沒變", async () => {
    const before = await rowOf(miaId);
    const logsBefore = await logsOf(miaId);
    const r = await mergePasteIntoClient(B.db, B.id, miaId, draft({ fields: { phone: "0900-000-777", gender: "女", area: "北屯" } }));
    expect(r).toEqual({ ok: false, error: "not_found" });
    expect(await rowOf(miaId)).toEqual(before);
    expect(await logsOf(miaId)).toEqual(logsBefore);
  });

  test("電話不同（就算名字一樣）或草稿沒電話 → 拒絕，資料沒變", async () => {
    const before = await rowOf(miaId);
    expect(await mergePasteIntoClient(A.db, A.id, miaId, draft({ name: "Mia", fields: { phone: "0900-000-778", gender: "女" } }))).toEqual({ ok: false, error: "phone_mismatch" });
    expect(await mergePasteIntoClient(A.db, A.id, miaId, draft({ name: "Mia", fields: { gender: "女" } }))).toEqual({ ok: false, error: "phone_mismatch" });
    expect(await rowOf(miaId)).toEqual(before);
  });

  test("客戶不存在 → 拒絕", async () => {
    const r = await mergePasteIntoClient(A.db, A.id, crypto.randomUUID(), draft({ fields: { phone: "0900-000-777" } }));
    expect(r).toEqual({ ok: false, error: "not_found" });
  });

  test("A 補進自己的客戶卡：只填空白、不覆蓋原值，並寫進追蹤紀錄", async () => {
    const r = await mergePasteIntoClient(
      A.db, A.id, miaId,
      draft({
        summary: "客人改想住北屯", moveInDate: "2026-11-01", leaseEnd: "2026-11-30", needsSubsidy: true,
        fields: { phone: "0900 000 777", area: "北屯", budget: "12000", gender: "女", age: "26 歲", people: "1人" },
      }),
    );
    expect(r).toEqual({ ok: true, clientId: miaId, filled: 3 });
    expect(await rowOf(miaId)).toMatchObject({
      // 原本有值：不動
      area: "西屯、台中榮總", budget: "10000", phone: "0900-000-777", people: "1 人", lease_end: "2026-10-31", name: "Mia", stage: "資料蒐集中",
      // 原本空白：補上
      gender: "女", age: "26 歲", move_in_date: "2026-11-01", needs_subsidy: true,
    });
    expect((await logsOf(miaId)).slice(2)).toEqual([
      "貼上對話補了 3 個欄位：客人改想住北屯",
      "和原本不同、沒有覆蓋：地區 北屯（原本 西屯、台中榮總）、預算 12000（原本 10000）、租約到期日 2026-11-30（原本 2026-10-31）",
    ]);
  });

  test("沒有新東西可補 → 資料不變，但更新時間會往後（算有進度）", async () => {
    const before = await rowOf(miaId);
    const r = await mergePasteIntoClient(A.db, A.id, miaId, draft({ fields: { phone: "0900-000-777" } }));
    expect(r).toEqual({ ok: true, clientId: miaId, filled: 0 });
    const after = await rowOf(miaId);
    expect({ ...after, updated_at: "" }).toEqual({ ...before, updated_at: "" });
    expect(Date.parse(after.updated_at)).toBeGreaterThan(Date.parse(before.updated_at));
    expect((await logsOf(miaId)).at(-1)).toBe("貼上對話補了 0 個欄位");
  });
});
