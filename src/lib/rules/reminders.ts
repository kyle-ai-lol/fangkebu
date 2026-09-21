// 提醒清單：AI 轉交、租約到期、今明帶看、約看沒電話、第 9 項只寫附近、3 天沒更新。

import { computeAliases, displayName } from "./alias";
import { fieldValue, isClosed, type Client, type Viewing } from "./client";
import { addDays, daysBetween, fmtMD, isYmd, toTaipei, type Ymd } from "./dates";
import { isVagueArea } from "./districts";

const DAY_MS = 86_400_000;

export type ReminderKind = "handoff" | "lease" | "viewing" | "no-phone" | "vague-area" | "idle";

export interface Reminder {
  clientId: string;
  kind: ReminderKind;
  /** 0 = 今天要處理、1 = 快到了、2 = 有空再處理 */
  level: 0 | 1 | 2;
  /** 左欄：日期，或「AI 轉交」「待辦」「待問」「追蹤」 */
  label: string;
  text: string;
  why: string;
  /** 同一個 level 裡的排序 */
  sortKey: number;
}

/** 租約到期前幾天提醒：學生或需要租補 15 天，其他 10 天 */
export function leaseLeadDays(isStudent: boolean, needsSubsidy: boolean): number {
  return isStudent || needsSubsidy ? 15 : 10;
}

/** 該聯絡客人的日期 */
export function leaseReminderDate(leaseEnd: Ymd, isStudent: boolean, needsSubsidy: boolean): Ymd {
  return addDays(leaseEnd, -leaseLeadDays(isStudent, needsSubsidy));
}

export interface ReminderInput {
  /** 同一位房仲的客人 */
  clients: readonly Client[];
  viewings: readonly Viewing[];
  /** 台灣的今天，用 todayInTaipei() */
  today: Ymd;
  now: Date;
}

export function computeReminders({ clients, viewings, today, now }: ReminderInput): Reminder[] {
  const aliases = computeAliases(clients, today);
  const viewingsOf = new Map<string, Viewing[]>();
  for (const v of viewings) {
    const list = viewingsOf.get(v.clientId);
    if (list) list.push(v);
    else viewingsOf.set(v.clientId, [v]);
  }

  const out: Reminder[] = [];
  for (const c of clients) {
    if (isClosed(c.stage)) continue;
    const name = displayName(aliases.get(c.id));
    const phone = fieldValue(c, "phone");
    const base = { clientId: c.id };

    if (c.handoffQuestion) {
      out.push({
        ...base, kind: "handoff", level: 0, sortKey: -9, label: "AI 轉交",
        text: `${name}：客人問了需要你本人回覆的問題`,
        why: `「${c.handoffQuestion.slice(0, 40)}」`,
      });
    }

    if (c.leaseEnd && isYmd(c.leaseEnd)) {
      const lead = leaseLeadDays(c.isStudent, c.needsSubsidy);
      const rd = addDays(c.leaseEnd, -lead);
      const diff = daysBetween(today, rd)!;
      if (diff <= 14) {
        const when =
          diff < 0 ? `已經晚了 ${-diff} 天，該聯絡問找房需求`
          : diff === 0 ? "今天該聯絡問找房需求"
          : `${diff} 天後該聯絡問找房需求`;
        out.push({
          ...base, kind: "lease", level: diff <= 0 ? 0 : 1, sortKey: diff, label: fmtMD(rd),
          text: `${name}：租約 ${fmtMD(c.leaseEnd)} 到期，${when}`,
          why: lead === 15 ? "學生或需租補，到期前 15 天提醒" : "到期前 10 天提醒",
        });
      }
    }

    const vs = viewingsOf.get(c.id) ?? [];
    let soonView = false;
    for (const v of vs) {
      const t = toTaipei(v.startsAt);
      const diff = daysBetween(today, t.ymd);
      if (diff !== 0 && diff !== 1) continue;
      soonView = true;
      out.push({
        ...base, kind: "viewing", level: diff === 0 ? 0 : 1, sortKey: diff - 0.5, label: fmtMD(t.ymd),
        text: `${name}：${diff === 0 ? "今天" : "明天"} ${t.hm} 帶看 ${v.address}`,
        why: phone ? `客人電話 ${phone}` : "還沒有電話，帶看前先跟客人要",
      });
    }

    if (!soonView && (c.stage === "已約看" || vs.length > 0) && !phone) {
      out.push({
        ...base, kind: "no-phone", level: 1, sortKey: 0.3, label: "待辦",
        text: `${name}：已約看，但還沒有電話`,
        why: "約看前一定要拿到電話",
      });
    }

    if (isVagueArea(fieldValue(c, "area"))) {
      out.push({
        ...base, kind: "vague-area", level: 2, sortKey: 5, label: "待問",
        text: `${name}：第 9 項只寫「${fieldValue(c, "area")}」`,
        why: "問清楚學校或公司全名，才對得到行政區",
      });
    }

    const idle = Math.floor((now.getTime() - Date.parse(c.updatedAt)) / DAY_MS);
    if (idle >= 3) {
      out.push({
        ...base, kind: "idle", level: 2, sortKey: 6, label: "追蹤",
        text: `${name}：已經 ${idle} 天沒更新進度`,
        why: "還沒結案，主動問一下客人找得如何",
      });
    }
  }

  // AI 轉交永遠排最前面（原型用 sortKey 排，租約逾期超過 9 天時會插到轉交前面）
  const rank = (r: Reminder) => (r.kind === "handoff" ? -1 : r.level);
  return out.sort((a, b) => rank(a) - rank(b) || a.sortKey - b.sortKey);
}

/** 後台分頁上的紅色數字：今天要處理和快到了的 */
export function urgentCount(reminders: readonly Reminder[]): number {
  return reminders.filter((r) => r.level < 2).length;
}

/** 客戶卡上「會在幾月幾號提醒你」那一行 */
export function leaseReminderLine(c: Pick<Client, "leaseEnd" | "isStudent" | "needsSubsidy">): string {
  const lead = leaseLeadDays(c.isStudent, c.needsSubsidy);
  if (!c.leaseEnd || !isYmd(c.leaseEnd)) return "填入現租約到期日，系統會在到期前 10 天提醒你聯絡（學生或需租補提前 15 天）。";
  return `會在 ${fmtMD(addDays(c.leaseEnd, -lead))} 提醒你聯絡客人（租約到期前 ${lead} 天${lead === 15 ? "，因為是學生或需租補" : ""}）。`;
}
