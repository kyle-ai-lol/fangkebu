// CLAUDE.md「必測案例」，一條對一個 test。
import { describe, expect, test } from "vitest";
import { addDays, computeAliases, computeReminders, fmtMD, leaseReminderDate, parseBudget, ruleExtract } from "./index";
import { makeClient, NOW, TODAY } from "./test-utils";

describe("CLAUDE.md 必測案例", () => {
  test("北區 8000，職業工程師與護理師兩位 → 未北區8000-工程、未北區8000-護理", () => {
    const eng = makeClient({ name: "阿哲", fields: { area: "北區", budget: "8000", job: "工程師" } });
    const nurse = makeClient({ name: "小芸", fields: { area: "北區", budget: "8000", job: "護理師" } });
    const aliases = computeAliases([eng, nurse], TODAY);
    expect(aliases.get(eng.id)?.text).toBe("未北區8000-工程");
    expect(aliases.get(nurse.id)?.text).toBe("未北區8000-護理");
  });

  test("入住日 45 天後 → 保留原本稱呼", () => {
    const c = makeClient({ name: "Leo", moveInDate: addDays(TODAY, 45), fields: { area: "南區", budget: "14000" } });
    expect(computeAliases([c], TODAY).get(c.id)).toMatchObject({ text: "Leo", raw: true });
  });

  test("沒有預算 → 保留原本稱呼", () => {
    const c = makeClient({ name: "陳小姐", fields: { area: "西屯" } });
    expect(computeAliases([c], TODAY).get(c.id)).toMatchObject({ text: "陳小姐", raw: true });
  });

  test("stage 已成交、南屯、10000 → 已南屯10000", () => {
    const c = makeClient({ name: "郭先生", stage: "已成交", fields: { area: "南屯", budget: "10000" } });
    expect(computeAliases([c], TODAY).get(c.id)?.text).toBe("已南屯10000");
  });

  test("地區「學校附近」、預算 8500 → 未8500，且列入待問", () => {
    const c = makeClient({ name: "學生妹", fields: { area: "學校附近", budget: "8500" } });
    expect(computeAliases([c], TODAY).get(c.id)?.text).toBe("未8500");
    const reminders = computeReminders({ clients: [c], viewings: [], today: TODAY, now: NOW });
    expect(reminders).toContainEqual(
      expect.objectContaining({ clientId: c.id, kind: "vague-area", label: "待問", text: "未8500：第 9 項只寫「學校附近」" }),
    );
  });

  test("地區「中國醫藥大學附近」、預算 7000 → 未北區7000", () => {
    const c = makeClient({ name: "小林", fields: { area: "中國醫藥大學附近", budget: "7000" } });
    expect(computeAliases([c], TODAY).get(c.id)?.text).toBe("未北區7000");
    // 對得到行政區，不算「只寫附近」
    const reminders = computeReminders({ clients: [c], viewings: [], today: TODAY, now: NOW });
    expect(reminders.some((r) => r.kind === "vague-area")).toBe(false);
  });

  test("學生、租約到期日 = 今天 + 13 天 → 提醒日 = 今天 − 2 天（已逾期）", () => {
    const leaseEnd = addDays(TODAY, 13);
    expect(leaseReminderDate(leaseEnd, true, false)).toBe(addDays(TODAY, -2));

    const c = makeClient({ name: "小林", isStudent: true, leaseEnd, fields: { budget: "7500", area: "北區" } });
    const lease = computeReminders({ clients: [c], viewings: [], today: TODAY, now: NOW }).find((r) => r.kind === "lease");
    expect(lease).toMatchObject({
      level: 0,
      label: fmtMD(addDays(TODAY, -2)),
      text: `未北區7500：租約 ${fmtMD(leaseEnd)} 到期，已經晚了 2 天，該聯絡問找房需求`,
      why: "學生或需租補，到期前 15 天提醒",
    });
  });

  test("「1 萬以內」→ 預算 10000；「8千」→ 8000", () => {
    expect(parseBudget("1 萬以內")).toBe(10000);
    expect(parseBudget("8千")).toBe(8000);
    // 從對話抽取也要抓得到
    expect(ruleExtract("想找 1 萬以內的套房", TODAY).fields.budget).toBe("10000");
    expect(ruleExtract("預算8千", TODAY).fields.budget).toBe("8000");
  });
});
