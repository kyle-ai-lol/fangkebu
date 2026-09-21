import { describe, expect, test } from "vitest";
import { calendarTitle, googleCalendarLink, onViewingAdded } from "./index";

const viewing = { startsAt: "2026-09-20T19:00:00+08:00", address: "西屯示範路 88 號 5F" };

describe("新增約看", () => {
  test.each(["新詢問", "資料蒐集中", "待推薦"] as const)("%s → 自動改成已約看，並寫進追蹤紀錄", (stage) => {
    expect(onViewingAdded(stage, viewing)).toEqual({
      stage: "已約看",
      logs: ["排約看：9/20（日）19:00 西屯示範路 88 號 5F", `階段：${stage} → 已約看`],
    });
  });

  test.each(["已約看", "斡旋中", "已成交", "暫停"] as const)("%s → 階段不動，只記約看", (stage) => {
    expect(onViewingAdded(stage, viewing)).toEqual({ stage, logs: ["排約看：9/20（日）19:00 西屯示範路 88 號 5F"] });
  });
});

describe("Google 日曆", () => {
  test("標題：帶看｜代稱｜電話", () => {
    expect(calendarTitle("未北區8000-工程", "0900-000-106")).toBe("帶看｜未北區8000-工程｜0900-000-106");
    expect(calendarTitle("未北區8000", "")).toBe("帶看｜未北區8000｜未提供電話");
  });

  test("連結帶台灣時間、1 小時、地址和客戶資料", () => {
    const url = new URL(
      googleCalendarLink({
        alias: "未西屯12000",
        clientName: "陳小姐",
        phone: "0900-000-102",
        summary: "西屯，12,000 元，1 人",
        startsAt: "2026-09-20T11:00:00Z",
        address: "西屯示範路 88 號 5F",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: "TEMPLATE",
      text: "帶看｜未西屯12000｜0900-000-102",
      dates: "20260920T190000/20260920T200000",
      ctz: "Asia/Taipei",
      location: "西屯示範路 88 號 5F",
      details: "客戶：未西屯12000（陳小姐）\n電話：0900-000-102\n條件：西屯，12,000 元，1 人\n\n由房客簿建立",
    });
  });
});
