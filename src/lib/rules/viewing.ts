// 約看：新增約看時自動改階段、Google 日曆行程。

import type { Stage } from "./client";
import { fmtWhen, toTaipei } from "./dates";

/** 在這三個階段新增約看，階段自動改成「已約看」 */
const AUTO_TO_VIEWING: readonly Stage[] = ["新詢問", "資料蒐集中", "待推薦"];

/** 新增約看後的階段，和要寫進追蹤紀錄的文字 */
export function onViewingAdded(
  stage: Stage,
  viewing: { startsAt: string; address: string },
): { stage: Stage; logs: string[] } {
  const logs = [`排約看：${fmtWhen(viewing.startsAt)} ${viewing.address}`];
  if (!AUTO_TO_VIEWING.includes(stage)) return { stage, logs };
  logs.push(`階段：${stage} → 已約看`);
  return { stage: "已約看", logs };
}

/** 日曆行程標題：帶看｜{代稱}｜{電話} */
export function calendarTitle(alias: string, phone: string): string {
  return `帶看｜${alias}｜${phone || "未提供電話"}`;
}

/** 台灣時間 20260920T190000，給 Google 日曆連結用（搭配 ctz=Asia/Taipei） */
function gcalTime(instant: Date): string {
  const t = toTaipei(instant);
  return `${t.ymd.replace(/-/g, "")}T${t.hm.replace(":", "")}00`;
}

/** 「加到 Google 日曆」連結，行程預設 1 小時 */
export function googleCalendarLink(args: {
  alias: string;
  /** 原本稱呼 */
  clientName: string;
  phone: string;
  /** summary() 的條件摘要 */
  summary: string;
  startsAt: string;
  address: string;
}): string {
  const start = new Date(args.startsAt);
  const end = new Date(start.getTime() + 3_600_000);
  const phone = args.phone || "未提供電話";
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: calendarTitle(args.alias, args.phone),
    dates: `${gcalTime(start)}/${gcalTime(end)}`,
    ctz: "Asia/Taipei",
    location: args.address || "",
    details:
      `客戶：${args.alias}${args.clientName ? `（${args.clientName}）` : ""}\n` +
      `電話：${phone}\n條件：${args.summary}\n\n由房客簿建立`,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
