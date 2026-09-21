import { describe, expect, test } from "vitest";
import { agoLabel, fmtStamp, leaseReminderLine } from "./index";
import { NOW } from "./test-utils";

describe("顯示用", () => {
  test("紀錄時間用台灣時間", () => {
    expect(fmtStamp("2026-09-19T06:05:00Z")).toBe("9/19 14:05");
  });

  test("更新時間：今天、昨天、幾天前", () => {
    expect(agoLabel(NOW, NOW)).toBe("今天");
    expect(agoLabel(new Date(NOW.getTime() - 86_400_000), NOW)).toBe("昨天");
    expect(agoLabel(new Date(NOW.getTime() - 3 * 86_400_000), NOW)).toBe("3 天前");
  });

  test("租約提醒說明", () => {
    expect(leaseReminderLine({ leaseEnd: null, isStudent: false, needsSubsidy: false })).toContain("填入現租約到期日");
    expect(leaseReminderLine({ leaseEnd: "2026-10-31", isStudent: false, needsSubsidy: false })).toBe("會在 10/21 提醒你聯絡客人（租約到期前 10 天）。");
    expect(leaseReminderLine({ leaseEnd: "2026-10-31", isStudent: true, needsSubsidy: false })).toBe("會在 10/16 提醒你聯絡客人（租約到期前 15 天，因為是學生或需租補）。");
  });
});
