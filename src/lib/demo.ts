// 示範客戶：移植自原型的 loadDemo()，全部虛構，電話一律 0900-000-xxx。
// 日期都相對「今天」算，所以任何時候放進去，提醒頁都看得到各種情況。
import { fieldsToColumns, type ClientInsert } from "./db/mappers";
import { addDays, fmtMD, type ClientFields, type Stage, type Ymd } from "./rules";

export interface DemoClient {
  row: Omit<ClientInsert, "agent_id">;
  viewings: { startsAt: string; address: string }[];
}

const DAY_MS = 86_400_000;

export function demoClients(today: Ymd, now: Date): DemoClient[] {
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS).toISOString();
  const taipei = (ymd: Ymd, hm: string) => new Date(`${ymd}T${hm}:00+08:00`).toISOString();

  const list: {
    name: string; stage: Stage; idle: number; fields: Partial<ClientFields>;
    student?: boolean; leaseEnd?: Ymd; moveInDate?: Ymd; handoff?: string; viewings?: DemoClient["viewings"];
  }[] = [
    { name: "小林", stage: "資料蒐集中", student: true, leaseEnd: addDays(today, 13), idle: 1,
      fields: { people: "1 人", moveIn: "下個月初", job: "學生", smoke: "無", pet: "無", phone: "0900-000-101", gender: "女", age: "20 歲", area: "北區、中國醫藥大學", budget: "7500", transport: "機車", commute: "10 分鐘" } },
    { name: "陳小姐", stage: "已約看", moveInDate: addDays(today, 8), idle: 0,
      fields: { people: "1 人", moveIn: fmtMD(addDays(today, 8)), job: "上班族", smoke: "無", pet: "一隻貓", phone: "0900-000-102", gender: "女", age: "28 歲", area: "西屯", budget: "12000", transport: "機車", commute: "15 分鐘" },
      viewings: [{ startsAt: taipei(addDays(today, 1), "19:00"), address: "西屯示範路 88 號 5F" }] },
    { name: "Andy", stage: "已約看", moveInDate: addDays(today, 5), idle: 2,
      fields: { people: "1 人", moveIn: fmtMD(addDays(today, 5)), job: "工程師", smoke: "有", pet: "無", phone: "", gender: "男", age: "31 歲", area: "大雅、中科", budget: "9000", transport: "汽車", commute: "10 分鐘" },
      viewings: [{ startsAt: taipei(today, "20:30"), address: "大雅示範街 5 號 2F" }] },
    { name: "王先生", stage: "斡旋中", idle: 0,
      fields: { people: "2 人", moveIn: "月底", job: "業務", smoke: "無", pet: "無", phone: "0900-000-104", gender: "男", age: "35 歲", area: "北屯", budget: "15000", transport: "汽車", commute: "" } },
    { name: "學生妹", stage: "資料蒐集中", student: true, idle: 4,
      fields: { people: "1 人", moveIn: "", job: "學生", smoke: "", pet: "", phone: "", gender: "女", age: "20 歲", area: "學校附近", budget: "8500", transport: "機車", commute: "" } },
    { name: "阿哲", stage: "待推薦", idle: 1,
      fields: { people: "1 人", moveIn: "下週", job: "工程師", smoke: "無", pet: "無", phone: "0900-000-106", gender: "男", age: "27 歲", area: "北區", budget: "8000", transport: "機車", commute: "20 分鐘" } },
    { name: "小芸", stage: "新詢問", idle: 0, handoff: "租金可以便宜一點嗎",
      fields: { people: "1 人", moveIn: "", job: "護理師", smoke: "無", pet: "", phone: "0900-000-107", gender: "女", age: "", area: "北區", budget: "8000", transport: "", commute: "" } },
    { name: "Leo", stage: "新詢問", moveInDate: addDays(today, 45), idle: 0,
      fields: { people: "2 人", moveIn: fmtMD(addDays(today, 45)), job: "上班族", smoke: "無", pet: "一隻狗", phone: "0900-000-109", gender: "男", age: "29 歲", area: "南區", budget: "14000", transport: "機車", commute: "" } },
    { name: "郭先生", stage: "已成交", idle: 6,
      fields: { people: "1 人", moveIn: "已入住", job: "上班族", smoke: "無", pet: "無", phone: "0900-000-108", gender: "男", age: "40 歲", area: "南屯", budget: "10000", transport: "汽車", commute: "25 分鐘" } },
  ];

  return list.map((d, i) => ({
    row: {
      ...fieldsToColumns(d.fields),
      name: d.name,
      stage: d.stage,
      source: "示範",
      is_student: !!d.student,
      lease_end: d.leaseEnd ?? null,
      move_in_date: d.moveInDate ?? null,
      handoff_question: d.handoff ?? null,
      // 建立時間照清單順序錯開，重複代稱的編號才會固定
      created_at: new Date(now.getTime() - 10 * DAY_MS + i * 1000).toISOString(),
      updated_at: at(d.idle),
    },
    viewings: d.viewings ?? [],
  }));
}
