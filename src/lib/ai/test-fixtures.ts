// AI 測試共用的虛構資料。電話一律 0900-000-xxx。

import type { AiPaste } from "./schema";

/** 原型「貼上示範對話」的虛構內容 */
export const CHAT = [
  "10:12 Mia：你好～我看到你們的物件，想問西屯有沒有 1 萬以內的套房",
  "10:15 我：您好！請問幾位入住、什麼時候想搬呢？",
  "10:20 Mia：我一個人，11/1 左右，我在台中榮總當護理師",
  "10:21 Mia：我有一隻貓可以嗎",
  "10:25 我：可以幫您找能養貓的，方便留電話嗎？",
  "10:30 Mia：0900-000-777，我騎機車，希望 15 分鐘內到醫院",
  "10:31 Mia：我現在的租約 10/31 到期",
].join("\n");

/** 符合結構的 AI 輸出 */
export function validAiOutput(): AiPaste {
  return {
    customerName: "Mia",
    fields: {
      people: "1 人", moveIn: "11/1 左右", job: "護理師", smoke: "", pet: "一隻貓", phone: "0900-000-777",
      gender: "", age: "", area: "西屯、台中榮總", budget: "10000", transport: "機車", commute: "15 分鐘",
    },
    moveInDate: "2026-11-01",
    leaseEnd: "2026-10-31",
    student: null,
    subsidy: null,
    summary: "護理師想找西屯 1 萬以內、可養貓的套房，11/1 左右入住",
  };
}
