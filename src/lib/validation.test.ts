import { describe, expect, test } from "vitest";
import { emptyFields, PASTE_MAX, PASTE_TOO_LONG, type PasteDraft } from "./rules";
import { firstError, pasteSaveSchema, pasteTextSchema } from "./validation";

function draft(p: Partial<PasteDraft> = {}): PasteDraft {
  return { name: "Mia", fields: emptyFields(), moveInDate: null, leaseEnd: null, isStudent: false, needsSubsidy: false, summary: "", ...p };
}

const errorOf = (r: { success: boolean; error?: Parameters<typeof firstError>[0] }) => (r.success ? null : firstError(r.error!));

describe("貼上的對話", () => {
  test("空白 → 請先貼上", () => {
    expect(errorOf(pasteTextSchema.safeParse(""))).toBe("先貼上一段對話");
    expect(errorOf(pasteTextSchema.safeParse("  \n  "))).toBe("先貼上一段對話");
  });

  test("剛好 12,000 字可以；多一個字就請房仲分段，不截斷", () => {
    expect(pasteTextSchema.safeParse("字".repeat(PASTE_MAX)).success).toBe(true);
    expect(errorOf(pasteTextSchema.safeParse("字".repeat(PASTE_MAX + 1)))).toBe(PASTE_TOO_LONG);
  });

  test("不是字串 → 不合格", () => {
    expect(pasteTextSchema.safeParse({ text: "你好" }).success).toBe(false);
    expect(pasteTextSchema.safeParse(null).success).toBe(false);
  });
});

describe("存檔前重新驗證草稿（瀏覽器傳回來的）", () => {
  test("合格的草稿照原樣通過，文字去掉前後空白", () => {
    const r = pasteSaveSchema.safeParse({ draft: draft({ name: " Mia ", fields: { ...emptyFields(), area: " 北區 " }, leaseEnd: "2026-10-31" }) });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.draft.name).toBe("Mia");
    expect(r.data.draft.fields.area).toBe("北區");
    expect(r.data.draft.leaseEnd).toBe("2026-10-31");
    expect(r.data.mergeInto).toBeUndefined();
  });

  test("欄位太長、日期無效、少欄位、型別不對 → 不合格", () => {
    expect(pasteSaveSchema.safeParse({ draft: draft({ fields: { ...emptyFields(), area: "區".repeat(101) } }) }).success).toBe(false);
    expect(pasteSaveSchema.safeParse({ draft: draft({ name: "名".repeat(41) }) }).success).toBe(false);
    expect(pasteSaveSchema.safeParse({ draft: draft({ summary: "摘".repeat(201) }) }).success).toBe(false);
    expect(errorOf(pasteSaveSchema.safeParse({ draft: draft({ moveInDate: "2026-02-30" }) }))).toBe("日期格式不對");
    const { phone: _phone, ...missingPhone } = emptyFields();
    void _phone;
    expect(pasteSaveSchema.safeParse({ draft: { ...draft(), fields: missingPhone } }).success).toBe(false);
    expect(pasteSaveSchema.safeParse({ draft: { ...draft(), isStudent: "yes" } }).success).toBe(false);
    expect(pasteSaveSchema.safeParse({}).success).toBe(false);
  });

  test("mergeInto 要是客戶 id（uuid）", () => {
    expect(pasteSaveSchema.safeParse({ draft: draft(), mergeInto: "0b8f6f0e-6f6b-4d53-9f8e-3d2b6c1a7e11" }).success).toBe(true);
    expect(pasteSaveSchema.safeParse({ draft: draft(), mergeInto: "abc" }).success).toBe(false);
    expect(pasteSaveSchema.safeParse({ draft: draft(), mergeInto: "' or 1=1 --" }).success).toBe(false);
  });
});
