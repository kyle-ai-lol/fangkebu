import { describe, expect, test } from "vitest";
import { addDays, daysBetween, fmtMD, fmtWhen, isYmd, mdToYmd, todayInTaipei } from "./index";

describe("台灣時間的今天", () => {
  test("UTC 還是 9/18 16:30，台灣已經是 9/19 凌晨", () => {
    expect(todayInTaipei(new Date("2026-09-18T16:30:00Z"))).toBe("2026-09-19");
  });

  test("UTC 9/18 15:59 = 台灣 9/18 23:59", () => {
    expect(todayInTaipei(new Date("2026-09-18T15:59:00Z"))).toBe("2026-09-18");
  });
});

describe("日期計算", () => {
  test("跨月、跨年、閏年", () => {
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  test("daysBetween：後面的日期比較晚就是正數", () => {
    expect(daysBetween("2026-09-19", "2026-11-03")).toBe(45);
    expect(daysBetween("2026-09-19", "2026-09-17")).toBe(-2);
    expect(daysBetween("2026-09-19", "不是日期")).toBeNull();
  });

  test("isYmd 只接受真的存在的日期", () => {
    expect(isYmd("2026-09-19")).toBe(true);
    expect(isYmd("2026-02-30")).toBe(false);
    expect(isYmd("2026/09/19")).toBe(false);
    expect(isYmd(null)).toBe(false);
  });

  test("顯示格式", () => {
    expect(fmtMD("2026-09-05")).toBe("9/5");
    expect(fmtWhen("2026-09-20T11:00:00Z")).toBe("9/20（日）19:00");
  });
});

describe("只講月日時推算年份（今天 2026-09-19）", () => {
  test.each([
    [10, 31, "2026-10-31"],
    [7, 22, "2026-07-22"], // 59 天前，還算今年
    [7, 21, "2027-07-21"], // 60 天前，當成明年
    [3, 15, "2027-03-15"],
    [11, undefined, "2026-11-01"], // 沒講日期就當 1 號
  ])("%s/%s → %s", (m, d, expected) => {
    expect(mdToYmd(m, d, "2026-09-19")).toBe(expected);
  });

  test("年底講一月 → 明年", () => {
    expect(mdToYmd(1, 5, "2026-12-20")).toBe("2027-01-05");
  });
});
