// 測試用的虛構客人。電話一律 0900-000-xxx。

import type { Client, Viewing } from "./client";

/** 測試固定的「今天」：台灣 2026-09-19（星期六）早上 10 點 */
export const TODAY = "2026-09-19";
export const NOW = new Date("2026-09-19T10:00:00+08:00");

let seq = 0;

/** 依呼叫順序建立：越晚建立的 createdAt 越晚 */
export function makeClient(p: Partial<Client> = {}): Client {
  seq++;
  return {
    id: `c${seq}`,
    agentId: "agent-a",
    name: "",
    moveInDate: null,
    leaseEnd: null,
    isStudent: false,
    needsSubsidy: false,
    stage: "新詢問",
    handoffQuestion: null,
    createdAt: new Date(Date.UTC(2026, 8, 1) + seq * 60_000).toISOString(),
    updatedAt: NOW.toISOString(),
    ...p,
    fields: { ...p.fields },
  };
}

export function makeViewing(clientId: string, startsAt: string, address = "北區示範路 12 號 3F"): Viewing {
  seq++;
  return { id: `v${seq}`, clientId, startsAt, address };
}

/** now 往前推 n 天的 ISO 時間 */
export function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86_400_000).toISOString();
}
