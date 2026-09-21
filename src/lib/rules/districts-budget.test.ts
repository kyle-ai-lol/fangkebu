import { describe, expect, test } from "vitest";
import { detectDistricts, districtShort, isVagueArea, parseBudget, shortPlace, summary } from "./index";

describe("行政區判斷", () => {
  test("照文字出現順序", () => {
    expect(detectDistricts("西屯、北區")).toEqual(["西屯區", "北區"]);
    expect(detectDistricts("想住北區或西屯")).toEqual(["北區", "西屯區"]);
  });

  test("學校醫院換成行政區，已經有的不重複", () => {
    expect(detectDistricts("我在逢甲讀書")).toEqual(["西屯區"]);
    expect(detectDistricts("北區、中國醫藥大學")).toEqual(["北區"]);
    expect(detectDistricts("靜宜大學")).toEqual(["沙鹿區"]);
  });

  test("對不到就是空的", () => {
    expect(detectDistricts("台中車站")).toEqual([]);
    expect(detectDistricts("")).toEqual([]);
    expect(detectDistricts(null)).toEqual([]);
  });

  test("代稱用的區名", () => {
    expect(districtShort("北屯區")).toBe("北屯");
    expect(districtShort("北區")).toBe("北區");
    expect(districtShort("中區")).toBe("中區");
  });

  test("只寫附近才要追問", () => {
    expect(isVagueArea("學校附近")).toBe(true);
    expect(isVagueArea("公司附近")).toBe(true);
    expect(isVagueArea("北區附近")).toBe(false);
    expect(isVagueArea("中國醫藥大學附近")).toBe(false);
    expect(isVagueArea("中科附近")).toBe(false);
    expect(isVagueArea("北區")).toBe(false);
  });

  test("對不到行政區時取前 6 個字", () => {
    expect(shortPlace("台中車站、一中街")).toBe("台中車站");
    expect(shortPlace("國立台中圖書館總館")).toBe("國立台中圖書");
  });
});

describe("預算解析", () => {
  test.each([
    ["8000", 8000],
    ["8,000", 8000],
    ["7500 元", 7500],
    ["1萬", 10000],
    ["1.5萬", 15000],
    ["1萬5", 15000],
    ["8千", 8000],
    ["8k", 8000],
    ["8K以內", 8000],
    ["看情況", 0],
    ["", 0],
  ])("「%s」→ %i", (input, expected) => {
    expect(parseBudget(input)).toBe(expected);
  });

  test("null、數字也能處理", () => {
    expect(parseBudget(null)).toBe(0);
    expect(parseBudget(12000)).toBe(12000);
  });
});

describe("條件摘要", () => {
  test("地區換成區名、預算加千分位、有寵物才寫", () => {
    const fields = { area: "北區、中國醫藥大學", budget: "7500", people: "1 人", moveIn: "下個月初", pet: "無" };
    expect(summary({ fields })).toBe("北區，7,500 元，1 人，下個月初 入住");
    expect(summary({ fields: { ...fields, pet: "一隻貓" } })).toBe("北區，7,500 元，1 人，下個月初 入住，寵物：一隻貓");
  });

  test("什麼都沒有", () => {
    expect(summary({ fields: {} })).toBe("條件還沒問");
  });
});
