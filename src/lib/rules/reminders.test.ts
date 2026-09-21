import { describe, expect, test } from "vitest";
import { addDays, computeReminders, fmtMD, urgentCount, type Client, type Viewing } from "./index";
import { daysAgo, makeClient, makeViewing, NOW, TODAY } from "./test-utils";

const remind = (clients: Client[], viewings: Viewing[] = []) =>
  computeReminders({ clients, viewings, today: TODAY, now: NOW });

const base = { area: "北區", budget: "8000", phone: "0900-000-106" };

describe("租約到期提醒", () => {
  test("一般客人：到期前 10 天，還沒到就寫幾天後", () => {
    const c = makeClient({ leaseEnd: addDays(TODAY, 20), fields: base });
    expect(remind([c])).toEqual([
      expect.objectContaining({ kind: "lease", level: 1, label: fmtMD(addDays(TODAY, 10)), why: "到期前 10 天提醒" }),
    ]);
    expect(remind([c])[0].text).toContain("10 天後該聯絡問找房需求");
  });

  test("提醒日還在 14 天以後 → 先不列", () => {
    const c = makeClient({ leaseEnd: addDays(TODAY, 25), fields: base });
    expect(remind([c])).toEqual([]);
  });

  test("提醒日是今天 → 今天該聯絡", () => {
    const c = makeClient({ leaseEnd: addDays(TODAY, 10), fields: base });
    expect(remind([c])[0]).toMatchObject({ level: 0, text: expect.stringContaining("今天該聯絡問找房需求") });
  });

  test("需要租補 → 提前 15 天", () => {
    const c = makeClient({ needsSubsidy: true, leaseEnd: addDays(TODAY, 15), fields: base });
    expect(remind([c])[0]).toMatchObject({ label: fmtMD(TODAY), why: "學生或需租補，到期前 15 天提醒" });
  });
});

describe("帶看提醒", () => {
  test("今天有帶看、有電話 → 列出時間地址和電話", () => {
    const c = makeClient({ stage: "已約看", fields: { ...base, phone: "0900-000-102" } });
    const v = makeViewing(c.id, "2026-09-19T19:00:00+08:00", "西屯示範路 88 號 5F");
    expect(remind([c], [v])).toEqual([
      expect.objectContaining({
        kind: "viewing", level: 0, label: "9/19",
        text: "未北區8000：今天 19:00 帶看 西屯示範路 88 號 5F",
        why: "客人電話 0900-000-102",
      }),
    ]);
  });

  test("明天有帶看、沒電話 → 提示先要電話，不再另列待辦", () => {
    const c = makeClient({ stage: "已約看", fields: { area: "北區", budget: "8000" } });
    const v = makeViewing(c.id, "2026-09-20T11:00:00Z"); // 台灣時間 9/20 19:00
    const r = remind([c], [v]);
    expect(r).toEqual([
      expect.objectContaining({ kind: "viewing", level: 1, text: "未北區8000：明天 19:00 帶看 北區示範路 12 號 3F", why: "還沒有電話，帶看前先跟客人要" }),
    ]);
  });

  test("用台灣時間判斷哪一天：UTC 9/19 16:30 = 台灣 9/20 00:30，算明天", () => {
    const c = makeClient({ fields: base });
    const v = makeViewing(c.id, "2026-09-19T16:30:00Z");
    expect(remind([c], [v])[0]).toMatchObject({ kind: "viewing", text: expect.stringContaining("明天 00:30") });
  });

  test("後天的帶看不列", () => {
    const c = makeClient({ stage: "已約看", fields: base });
    const v = makeViewing(c.id, "2026-09-21T19:00:00+08:00");
    expect(remind([c], [v])).toEqual([]);
  });
});

describe("待辦、待問、追蹤", () => {
  test("已約看、沒有今明帶看、沒電話 → 待辦", () => {
    const c = makeClient({ stage: "已約看", fields: { area: "北區", budget: "8000" } });
    expect(remind([c])).toEqual([
      expect.objectContaining({ kind: "no-phone", level: 1, label: "待辦", text: "未北區8000：已約看，但還沒有電話" }),
    ]);
  });

  test("階段還沒改，但已經有約看、沒電話 → 也列待辦", () => {
    const c = makeClient({ stage: "新詢問", fields: { area: "北區", budget: "8000" } });
    const v = makeViewing(c.id, "2026-09-25T19:00:00+08:00");
    expect(remind([c], [v]).map((r) => r.kind)).toEqual(["no-phone"]);
  });

  test("3 天沒更新 → 追蹤；2 天還不用", () => {
    const idle3 = makeClient({ updatedAt: daysAgo(3), fields: base });
    const idle2 = makeClient({ updatedAt: daysAgo(2), fields: { ...base, budget: "9000" } });
    expect(remind([idle3, idle2])).toEqual([
      expect.objectContaining({ clientId: idle3.id, kind: "idle", label: "追蹤", text: "未北區8000：已經 3 天沒更新進度" }),
    ]);
  });

  test("已成交、暫停 → 什麼都不提醒", () => {
    const loud = { handoffQuestion: "租金可以便宜一點嗎", leaseEnd: addDays(TODAY, 5), updatedAt: daysAgo(10), fields: { area: "學校附近", budget: "8000" } };
    const done = makeClient({ ...loud, stage: "已成交" });
    const paused = makeClient({ ...loud, stage: "暫停" });
    expect(remind([done, paused])).toEqual([]);
  });
});

describe("排序", () => {
  test("AI 轉交排最前面，即使租約已經逾期 30 天（原型在這裡會排錯）", () => {
    const overdue = makeClient({ leaseEnd: addDays(TODAY, -20), fields: base }); // 提醒日 = 今天 − 30
    const handoff = makeClient({ handoffQuestion: "租金可以便宜一點嗎", fields: { ...base, budget: "9000" } });
    const r = remind([overdue, handoff]);
    expect(r.map((x) => x.kind)).toEqual(["handoff", "lease"]);
    expect(r[0]).toMatchObject({ label: "AI 轉交", why: "「租金可以便宜一點嗎」" });
  });

  test("今天要處理 → 快到了 → 有空再處理", () => {
    const vague = makeClient({ fields: { area: "學校附近", budget: "8500", phone: "0900-000-105" } });
    const soon = makeClient({ leaseEnd: addDays(TODAY, 15), fields: base }); // 5 天後
    const today = makeClient({ leaseEnd: addDays(TODAY, 10), fields: { ...base, budget: "9000" } });
    const r = remind([vague, soon, today]);
    expect(r.map((x) => [x.kind, x.level])).toEqual([["lease", 0], ["lease", 1], ["vague-area", 2]]);
    expect(urgentCount(r)).toBe(2);
  });
});
