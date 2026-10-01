import { describe, expect, test } from "vitest";
import { findSamePhone, formatPhone, phoneDigits, samePhone } from "./index";
import { makeClient } from "./test-utils";

describe("電話比對", () => {
  test("寫法不同、號碼相同 → 同一支", () => {
    expect(samePhone("0900-000-777", "0900000777")).toBe(true);
    expect(samePhone("0900 000 777", "0900-000-777")).toBe(true);
    expect(samePhone("（手機）0900-000-777", "0900000777")).toBe(true);
  });

  test("+886 開頭當成 0", () => {
    expect(phoneDigits("+886 900-000-777")).toBe("0900000777");
    expect(phoneDigits("886900000777")).toBe("0900000777");
    expect(phoneDigits("+886 0900 000 777")).toBe("0900000777");
    expect(samePhone("+886 900 000 777", "0900-000-777")).toBe(true);
  });

  test("差一碼 → 不是同一支", () => {
    expect(samePhone("0900-000-777", "0900-000-778")).toBe(false);
  });

  test("少於 8 碼、空白、null → 一律不算同一支", () => {
    expect(samePhone("0900000", "0900000")).toBe(false);
    expect(samePhone("", "")).toBe(false);
    expect(samePhone(null, undefined)).toBe(false);
    expect(samePhone("還沒給", "還沒給")).toBe(false);
  });

  test("市話 8 碼以上照樣比", () => {
    expect(samePhone("04-2222-3333", "0422223333")).toBe(true);
  });
});

describe("找同一支電話的客人", () => {
  const mia = makeClient({ name: "Mia", fields: { phone: "0900-000-777" } });
  const mia2 = makeClient({ name: "Mia", fields: { phone: "0900-000-778" } });
  const noPhone = makeClient({ name: "Mia" });
  const couple = makeClient({ name: "阿凱", fields: { phone: "0900000777" } });
  const all = [mia, mia2, noPhone, couple];

  test("電話相同的全部列出，不管名字", () => {
    expect(findSamePhone(all, "0900 000 777").map((c) => c.id)).toEqual([mia.id, couple.id]);
  });

  test("名字一樣但電話不同或沒電話 → 不算", () => {
    expect(findSamePhone([mia2, noPhone], "0900-000-777")).toEqual([]);
  });

  test("要比的電話是空的 → 找不到任何人（不會對到其他沒電話的客人）", () => {
    expect(findSamePhone(all, "")).toEqual([]);
    expect(findSamePhone(all, null)).toEqual([]);
  });

  test("可以排除自己", () => {
    expect(findSamePhone(all, "0900-000-777", mia.id).map((c) => c.id)).toEqual([couple.id]);
  });
});

describe("電話格式", () => {
  test("手機統一成 09xx-xxx-xxx", () => {
    expect(formatPhone("0900000777")).toBe("0900-000-777");
    expect(formatPhone("+886 900 000 777")).toBe("0900-000-777");
    expect(formatPhone(" 0900 000 777 ")).toBe("0900-000-777");
  });

  test("不是手機就照原樣（去掉前後空白）", () => {
    expect(formatPhone(" 04-2222-3333 ")).toBe("04-2222-3333");
    expect(formatPhone("晚上再給")).toBe("晚上再給");
    expect(formatPhone(null)).toBe("");
  });
});
