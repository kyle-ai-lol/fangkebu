import { describe, expect, test } from "vitest";
import { ruleExtract } from "./index";
import { TODAY } from "./test-utils";

// 原型「貼上示範對話」的虛構內容
const PASTE_EXAMPLE = [
  "10:12 Mia：你好～我看到你們的物件，想問西屯有沒有 1 萬以內的套房",
  "10:15 我：您好！請問幾位入住、什麼時候想搬呢？",
  "10:20 Mia：我一個人，11/1 左右，我在台中榮總當護理師",
  "10:21 Mia：我有一隻貓可以嗎",
  "10:25 我：可以幫您找能養貓的，方便留電話嗎？",
  "10:30 Mia：0900-000-777，我騎機車，希望 15 分鐘內到醫院",
  "10:31 Mia：我現在的租約 10/31 到期",
].join("\n");

describe("規則模式抽取", () => {
  test("原型的示範對話", () => {
    expect(ruleExtract(PASTE_EXAMPLE, TODAY)).toEqual({
      fields: {
        phone: "0900-000-777",
        budget: "10000",
        area: "西屯、台中榮總",
        people: "1 人",
        pet: "一隻貓",
        transport: "機車",
        commute: "15 分鐘",
        job: "護理師",
        moveIn: "11/1",
      },
      leaseEnd: "2026-10-31",
      moveInDate: "2026-11-01",
    });
  });

  test("學生、學校、否定句", () => {
    const text = "我是學生，想住中國醫藥大學附近，預算 7500，沒養寵物也不抽菸，女生 20 歲，騎機車 10 分鐘";
    expect(ruleExtract(text, TODAY)).toEqual({
      fields: {
        area: "北區、中國醫藥大學",
        budget: "7500",
        smoke: "無",
        pet: "無",
        gender: "女",
        age: "20 歲",
        transport: "機車",
        commute: "10 分鐘",
        job: "學生",
      },
      student: true,
    });
  });

  test("只說學校附近 → 照原話填，之後列入待問", () => {
    expect(ruleExtract("想找學校附近的套房", TODAY).fields.area).toBe("學校附近");
  });

  test("月底入住 → 28 號", () => {
    expect(ruleExtract("10 月底可以入住", TODAY)).toMatchObject({ fields: { moveIn: "10月底" }, moveInDate: "2026-10-28" });
  });

  test("已經過了的月份的租約 → 明年", () => {
    expect(ruleExtract("租約 3/15 到期", TODAY).leaseEnd).toBe("2027-03-15");
  });

  test("人數、寵物、抽菸、租補", () => {
    const r = ruleExtract("兩個人住，有一隻狗，我會抽菸，需要租補", TODAY);
    expect(r.fields).toMatchObject({ people: "2 人", pet: "一隻狗", smoke: "有" });
    expect(r.subsidy).toBe(true);
  });

  test("電話統一成 09xx-xxx-xxx，不會被當成預算", () => {
    const r = ruleExtract("我的電話 0900000123", TODAY);
    expect(r.fields.phone).toBe("0900-000-123");
    expect(r.fields.budget).toBeUndefined();
  });

  test("沒提到的欄位不要猜", () => {
    expect(ruleExtract("你好", TODAY)).toEqual({ fields: {} });
  });
});
