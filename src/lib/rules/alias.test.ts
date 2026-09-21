import { describe, expect, test } from "vitest";
import { addDays, computeAliases, displayName, type Client } from "./index";
import { makeClient, TODAY } from "./test-utils";

const aliasOf = (c: Client, all: Client[] = [c]) => computeAliases(all, TODAY).get(c.id);

describe("代稱：入住日", () => {
  test("剛好 10 天內 → 換成代稱", () => {
    const c = makeClient({ name: "Andy", moveInDate: addDays(TODAY, 10), fields: { area: "北區", budget: "8000" } });
    expect(aliasOf(c)).toMatchObject({ text: "未北區8000", raw: false });
  });

  test("11 天 → 保留原本稱呼，並說明原因", () => {
    const c = makeClient({ name: "Andy", moveInDate: addDays(TODAY, 11), fields: { area: "北區", budget: "8000" } });
    expect(aliasOf(c)).toEqual({ text: "Andy", raw: true, why: "離入住還有 11 天，進入 10 天找房期再換成代稱" });
  });

  test("入住日已經過了 → 照樣用代稱", () => {
    const c = makeClient({ moveInDate: addDays(TODAY, -3), fields: { area: "北區", budget: "8000" } });
    expect(aliasOf(c)?.text).toBe("未北區8000");
  });

  test("入住日還很久、也沒有原本稱呼 → 預算＋金額", () => {
    const c = makeClient({ moveInDate: addDays(TODAY, 45), fields: { budget: "14000" } });
    expect(aliasOf(c)).toMatchObject({ text: "預算14000", raw: true });
  });

  test("沒有預算也沒有稱呼 → 顯示未命名客人", () => {
    const c = makeClient();
    expect(displayName(aliasOf(c))).toBe("未命名客人");
  });
});

describe("代稱：地區", () => {
  test.each([
    ["北屯", "未北屯8000"],
    ["東區", "未東區8000"],
    ["西屯、北區", "未西屯8000"], // 取第一個提到的
    ["大雅、中科", "未大雅8000"],
    ["逢甲大學", "未西屯8000"],
    ["台中榮總", "未西屯8000"],
    ["公司附近", "未8000"],
    ["台中車站", "未台中車站8000"], // 對不到行政區，用原文前 6 字
    ["", "未8000"],
  ])("地區「%s」→ %s", (area, expected) => {
    const c = makeClient({ fields: { area, budget: "8000" } });
    expect(aliasOf(c)?.text).toBe(expected);
  });

  test("預算寫「1萬5」→ 15000", () => {
    const c = makeClient({ fields: { area: "北區", budget: "1萬5" } });
    expect(aliasOf(c)?.text).toBe("未北區15000");
  });

  test("暫停不算成交，還是「未」", () => {
    const c = makeClient({ stage: "暫停", fields: { area: "南屯", budget: "10000" } });
    expect(aliasOf(c)?.text).toBe("未南屯10000");
  });
});

describe("代稱：重複", () => {
  test("只有一位 → 不加識別字", () => {
    const c = makeClient({ fields: { area: "北區", budget: "8000", job: "工程師" } });
    expect(aliasOf(c)).toEqual({ text: "未北區8000", raw: false });
  });

  test("職業也一樣 → 先建立的「-工程」，後建立的「-工程2」", () => {
    const first = makeClient({ fields: { area: "北區", budget: "8000", job: "工程師" } });
    const second = makeClient({ fields: { area: "北區", budget: "8000", job: "工程師" } });
    const map = computeAliases([second, first], TODAY); // 傳入順序不影響
    expect(map.get(first.id)?.text).toBe("未北區8000-工程");
    expect(map.get(second.id)?.text).toBe("未北區8000-工程2");
  });

  test("再來第三位工程師，前兩位的編號不變", () => {
    const a = makeClient({ fields: { area: "北區", budget: "8000", job: "工程師" } });
    const b = makeClient({ fields: { area: "北區", budget: "8000", job: "工程師" } });
    const c = makeClient({ fields: { area: "北區", budget: "8000", job: "工程師" } });
    const map = computeAliases([c, b, a], TODAY);
    expect([a, b, c].map((x) => map.get(x.id)?.text)).toEqual(["未北區8000-工程", "未北區8000-工程2", "未北區8000-工程3"]);
  });

  test("沒寫職業 → 用稱呼前兩字；都沒有 → 用編號", () => {
    const named = makeClient({ name: "王先生", fields: { area: "北區", budget: "8000" } });
    const blank = makeClient({ fields: { area: "北區", budget: "8000" } });
    const map = computeAliases([named, blank], TODAY);
    expect(map.get(named.id)?.text).toBe("未北區8000-王先");
    expect(map.get(blank.id)?.text).toBe("未北區8000-2");
  });

  test("未成交和已成交不算重複", () => {
    const open = makeClient({ fields: { area: "南屯", budget: "10000" } });
    const done = makeClient({ stage: "已成交", fields: { area: "南屯", budget: "10000" } });
    const map = computeAliases([open, done], TODAY);
    expect(map.get(open.id)?.text).toBe("未南屯10000");
    expect(map.get(done.id)?.text).toBe("已南屯10000");
  });

  test("多租戶：A、B 房仲各有一位「未北區8000」→ 互不影響，都不加識別字", () => {
    const a = makeClient({ agentId: "agent-a", fields: { area: "北區", budget: "8000", job: "工程師" } });
    const b = makeClient({ agentId: "agent-b", fields: { area: "北區", budget: "8000", job: "護理師" } });
    const map = computeAliases([a, b], TODAY);
    expect(map.get(a.id)?.text).toBe("未北區8000");
    expect(map.get(b.id)?.text).toBe("未北區8000");
  });

  test("多租戶：A 房仲自己重複才加識別字，B 房仲的不受影響", () => {
    const a1 = makeClient({ agentId: "agent-a", fields: { area: "北區", budget: "8000", job: "工程師" } });
    const a2 = makeClient({ agentId: "agent-a", fields: { area: "北區", budget: "8000", job: "護理師" } });
    const b1 = makeClient({ agentId: "agent-b", fields: { area: "北區", budget: "8000", job: "業務" } });
    const map = computeAliases([a1, a2, b1], TODAY);
    expect(map.get(a1.id)?.text).toBe("未北區8000-工程");
    expect(map.get(a2.id)?.text).toBe("未北區8000-護理");
    expect(map.get(b1.id)?.text).toBe("未北區8000");
  });
});
