import { describe, expect, test } from "vitest";
import {
  addDays, draftAlias, draftFromExtracted, emptyFields, guessNameFromChat, mergeDraft, mergeLogTexts,
  newClientLogTexts, pasteClientName, ruleExtract, stageForDraft, type PasteDraft,
} from "./index";
import { makeClient, NOW, TODAY } from "./test-utils";

function draft(p: Partial<Omit<PasteDraft, "fields">> & { fields?: Partial<PasteDraft["fields"]> } = {}): PasteDraft {
  return {
    name: "", moveInDate: null, leaseEnd: null, isStudent: false, needsSubsidy: false, summary: "",
    ...p,
    fields: { ...emptyFields(), ...p.fields },
  };
}

describe("抽出來的條件 → 草稿", () => {
  test("沒提到的欄位是空字串，日期沒有就是 null", () => {
    const d = draftFromExtracted(ruleExtract("想找西屯 1 萬以內，電話 0900-000-777，租約 10/31 到期", TODAY));
    expect(d.fields).toEqual({ ...emptyFields(), area: "西屯", budget: "10000", phone: "0900-000-777" });
    expect(d).toMatchObject({ name: "", summary: "", moveInDate: null, leaseEnd: "2026-10-31", isStudent: false, needsSubsidy: false });
  });

  test("職業寫了學生 → 當學生；有明說租補才算", () => {
    expect(draftFromExtracted({ fields: { job: "大學生" } }).isStudent).toBe(true);
    expect(draftFromExtracted({ fields: {}, student: true }).isStudent).toBe(true);
    expect(draftFromExtracted({ fields: { job: "工程師" } })).toMatchObject({ isStudent: false, needsSubsidy: false });
    expect(draftFromExtracted({ fields: {}, subsidy: true }).needsSubsidy).toBe(true);
  });

  test("稱呼、摘要、欄位都去掉前後空白", () => {
    const d = draftFromExtracted({ fields: { area: " 北區 " }, name: " Mia ", summary: " 想找北區套房 " });
    expect(d).toMatchObject({ name: "Mia", summary: "想找北區套房" });
    expect(d.fields.area).toBe("北區");
  });
});

describe("規則模式抓稱呼", () => {
  test("第一行冒號前面的名字（前面有時間也可以）", () => {
    expect(guessNameFromChat("10:12 Mia：你好～想問西屯的套房")).toBe("Mia");
    expect(guessNameFromChat("陳小姐: 請問還有房嗎")).toBe("陳小姐");
  });

  test("第一行是房仲自己、沒有冒號、名字太長 → 不取", () => {
    expect(guessNameFromChat("10:15 我：您好！")).toBe("");
    expect(guessNameFromChat("你好我想找房")).toBe("");
    expect(guessNameFromChat("這是一段超過十個字的很長很長的文字：後面")).toBe("");
  });
});

describe("存成新客戶", () => {
  test("12 項還有缺 → 資料蒐集中；問齊 → 待推薦", () => {
    expect(stageForDraft(draft({ fields: { area: "北區" } }))).toBe("資料蒐集中");
    const full = Object.fromEntries(Object.keys(emptyFields()).map((k) => [k, "有"])) as PasteDraft["fields"];
    expect(stageForDraft(draft({ fields: full }))).toBe("待推薦");
  });

  test("沒抓到稱呼 → LINE 客人＋台灣時間", () => {
    expect(pasteClientName(draft({ name: "Mia" }), NOW)).toBe("Mia");
    expect(pasteClientName(draft(), NOW)).toBe("LINE 客人 9/19 10:00");
  });

  test("追蹤紀錄：有摘要才多一行", () => {
    expect(newClientLogTexts("")).toEqual(["建立客戶卡（貼上整理）"]);
    expect(newClientLogTexts("想找西屯套房")).toEqual(["建立客戶卡（貼上整理）", "對話摘要：想找西屯套房"]);
  });

  test("預覽代稱照代稱規則", () => {
    expect(draftAlias(draft({ name: "Mia", fields: { area: "西屯、台中榮總", budget: "10000" } }), TODAY)).toMatchObject({ text: "未西屯10000", raw: false });
    expect(draftAlias(draft({ name: "Mia", fields: { area: "西屯" } }), TODAY)).toMatchObject({ text: "Mia", raw: true });
    expect(draftAlias(draft({ name: "Mia", moveInDate: addDays(TODAY, 43), fields: { area: "西屯", budget: "10000" } }), TODAY).raw).toBe(true);
  });
});

describe("補進舊客戶卡", () => {
  const existing = makeClient({
    name: "Mia", moveInDate: "2026-11-01",
    fields: { area: "西屯、台中榮總", budget: "10000", phone: "0900-000-777", people: "1 人" },
  });

  test("只填空白欄位；原本有值的不覆蓋，改列為「和原本不同」", () => {
    const r = mergeDraft(existing, draft({ fields: { area: "北屯", budget: "12000", phone: "0900000777", gender: "女", age: "26 歲" } }));
    expect(r.fields).toEqual({ gender: "女", age: "26 歲" });
    expect(r.filled).toBe(2);
    expect(r.conflicts).toEqual([
      { label: "地區", old: "西屯、台中榮總", next: "北屯" },
      { label: "預算", old: "10000", next: "12000" },
    ]);
  });

  test("寫法不同但意思一樣 → 不算不同（電話看號碼、預算看金額、其他不管空白）", () => {
    const r = mergeDraft(existing, draft({ fields: { phone: "+886 900 000 777", budget: "1 萬以內", people: "1人" } }));
    expect(r).toEqual({ fields: {}, filled: 0, conflicts: [] });
  });

  test("日期：原本沒有才填，原本有而且不同就不動", () => {
    const r = mergeDraft(existing, draft({ moveInDate: "2026-12-01", leaseEnd: "2026-10-31" }));
    expect(r.leaseEnd).toBe("2026-10-31");
    expect(r.moveInDate).toBeUndefined();
    expect(r.filled).toBe(1);
    expect(r.conflicts).toEqual([{ label: "最快入住日", old: "2026-11-01", next: "2026-12-01" }]);
  });

  test("學生、租補只會打開，不會關掉", () => {
    expect(mergeDraft(existing, draft({ isStudent: true, needsSubsidy: true }))).toMatchObject({ isStudent: true, needsSubsidy: true });
    const student = makeClient({ isStudent: true, needsSubsidy: true });
    const r = mergeDraft(student, draft());
    expect(r.isStudent).toBeUndefined();
    expect(r.needsSubsidy).toBeUndefined();
  });

  test("追蹤紀錄：補了幾欄、摘要；有不同的欄位另外一行", () => {
    expect(mergeLogTexts({ filled: 2, conflicts: [] }, "")).toEqual(["貼上對話補了 2 個欄位"]);
    expect(mergeLogTexts({ filled: 0, conflicts: [] }, "客人改想住北屯")).toEqual(["貼上對話補了 0 個欄位：客人改想住北屯"]);
    expect(
      mergeLogTexts({ filled: 1, conflicts: [{ label: "預算", old: "10000", next: "12000" }, { label: "地區", old: "西屯", next: "北屯" }] }, ""),
    ).toEqual(["貼上對話補了 1 個欄位", "和原本不同、沒有覆蓋：預算 12000（原本 10000）、地區 北屯（原本 西屯）"]);
  });
});
