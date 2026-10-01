import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describe, expect, test } from "vitest";
import { FIELD_DEFS } from "../rules";
import { aiPasteSchema, parseAiPaste } from "./schema";
import { validAiOutput } from "./test-fixtures";

/** 拿掉一個欄位的複本 */
function without<T extends object>(obj: T, key: keyof T): Partial<T> {
  const copy: Partial<T> = { ...obj };
  delete copy[key];
  return copy;
}

describe("AI 輸出的結構", () => {
  test("合格的輸出 → 和規則模式一樣的格式（空欄位不帶、沒明說的身份不帶）", () => {
    expect(parseAiPaste(validAiOutput())).toEqual({
      name: "Mia",
      summary: "護理師想找西屯 1 萬以內、可養貓的套房，11/1 左右入住",
      fields: {
        people: "1 人", moveIn: "11/1 左右", job: "護理師", pet: "一隻貓", phone: "0900-000-777",
        area: "西屯、台中榮總", budget: "10000", transport: "機車", commute: "15 分鐘",
      },
      moveInDate: "2026-11-01",
      leaseEnd: "2026-10-31",
    });
  });

  test("預算換成數字、手機換成 09xx-xxx-xxx、前後空白去掉", () => {
    const o = validAiOutput();
    o.customerName = "  Mia  ";
    o.fields.budget = "1 萬以內";
    o.fields.phone = "+886 900 000 777";
    o.fields.area = " 北區 ";
    const r = parseAiPaste(o)!;
    expect(r.name).toBe("Mia");
    expect(r.fields).toMatchObject({ budget: "10000", phone: "0900-000-777", area: "北區" });
  });

  test("預算看不懂 → 當成沒提到，不算不合格", () => {
    const o = validAiOutput();
    o.fields.budget = "還沒想好";
    const r = parseAiPaste(o)!;
    expect(r.fields.budget).toBeUndefined();
    expect(r.fields.area).toBe("西屯、台中榮總");
  });

  test("學生、租補只認 true；日期空字串 = 沒有", () => {
    const o = validAiOutput();
    o.student = true;
    o.subsidy = false;
    o.moveInDate = "";
    o.leaseEnd = "  ";
    const r = parseAiPaste(o)!;
    expect(r.student).toBe(true);
    expect(r).not.toHaveProperty("subsidy");
    expect(r).not.toHaveProperty("moveInDate");
    expect(r).not.toHaveProperty("leaseEnd");
  });

  test("太長的內容截到資料庫上限", () => {
    const o = validAiOutput();
    o.customerName = "名".repeat(60);
    o.summary = "摘".repeat(300);
    o.fields.area = "區".repeat(150);
    const r = parseAiPaste(o)!;
    expect(r.name).toHaveLength(40);
    expect(r.summary).toHaveLength(200);
    expect(r.fields.area).toHaveLength(100);
  });

  test.each([
    ["不是物件", "整理好了"],
    ["null", null],
    ["少了 summary", without(validAiOutput(), "summary")],
    ["12 項少一項", { ...validAiOutput(), fields: without(validAiOutput().fields, "commute") }],
    ["預算是數字不是字串", { ...validAiOutput(), fields: { ...validAiOutput().fields, budget: 10000 } }],
    ["student 是字串", { ...validAiOutput(), student: "是" }],
    ["入住日不是有效日期", { ...validAiOutput(), moveInDate: "2026-13-45" }],
    ["入住日沒有這一天", { ...validAiOutput(), moveInDate: "2026-02-30" }],
    ["租約到期日不是 YYYY-MM-DD", { ...validAiOutput(), leaseEnd: "10/31" }],
  ])("不合格（%s）→ null，整份不用", (_name, raw) => {
    expect(parseAiPaste(raw)).toBeNull();
  });
});

describe("交給 Anthropic API 的輸出格式", () => {
  const schema = zodOutputFormat(aiPasteSchema).schema as {
    type: string; required: string[]; additionalProperties: boolean;
    properties: { fields: { required: string[]; additionalProperties: boolean } };
  };

  test("每一項都必填，而且不能多出別的欄位（結構化輸出的要求）", () => {
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    expect([...schema.required].sort()).toEqual(["customerName", "fields", "leaseEnd", "moveInDate", "student", "subsidy", "summary"]);
    expect(schema.properties.fields.additionalProperties).toBe(false);
    expect([...schema.properties.fields.required].sort()).toEqual(FIELD_DEFS.map((f) => f.key).sort());
  });
});
