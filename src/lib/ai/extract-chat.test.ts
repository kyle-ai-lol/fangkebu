// AI 呼叫一律用假的（callAi 參數），不會連到 Anthropic。
import { afterEach, describe, expect, test, vi } from "vitest";
import { draftFromExtracted, guessNameFromChat, ruleExtract } from "../rules";
import { TODAY } from "../rules/test-utils";
import type { AiCallResult, AiFailure } from "./anthropic";
import { extractFromChat, pasteNotice } from "./extract-chat";
import { CHAT, validAiOutput } from "./test-fixtures";

const ruleDraft = draftFromExtracted({ ...ruleExtract(CHAT, TODAY), name: guessNameFromChat(CHAT) });
const fakeAi = (result: AiCallResult) => vi.fn(async () => result);

afterEach(() => vi.restoreAllMocks());

describe("AI 成功", () => {
  test("用 AI 的結果，標示 mode = ai", async () => {
    const callAi = fakeAi({ ok: true, output: validAiOutput() });
    const r = await extractFromChat(CHAT, TODAY, callAi);
    expect(callAi).toHaveBeenCalledExactlyOnceWith(CHAT, TODAY);
    expect(r.mode).toBe("ai");
    expect(r.reason).toBeUndefined();
    expect(r.draft).toMatchObject({
      name: "Mia", summary: "護理師想找西屯 1 萬以內、可養貓的套房，11/1 左右入住",
      moveInDate: "2026-11-01", leaseEnd: "2026-10-31", isStudent: false, needsSubsidy: false,
    });
    expect(r.draft.fields).toMatchObject({ area: "西屯、台中榮總", budget: "10000", phone: "0900-000-777", smoke: "", gender: "" });
  });
});

describe("AI 失敗 → 整份改用規則模式", () => {
  const REASONS: AiFailure[] = ["auth", "rate_limited", "timeout", "connection", "api_error", "refused", "truncated", "invalid_output"];

  test.each(REASONS)("%s", async (reason) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await extractFromChat(CHAT, TODAY, fakeAi({ ok: false, reason }));
    expect(r).toEqual({ mode: "rule", reason, draft: ruleDraft });
  });

  test("規則模式的結果：抓得到的條件和稱呼", () => {
    expect(ruleDraft).toMatchObject({ name: "Mia", summary: "", moveInDate: "2026-11-01", leaseEnd: "2026-10-31" });
    expect(ruleDraft.fields).toMatchObject({ area: "西屯、台中榮總", budget: "10000", phone: "0900-000-777", pet: "一隻貓" });
  });

  test("AI 的輸出驗證不過（日期無效）→ 不混用：連 AI 填的其他欄位也不採用", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = { ...validAiOutput(), moveInDate: "2026-13-45", fields: { ...validAiOutput().fields, area: "北屯", gender: "女" } };
    const r = await extractFromChat(CHAT, TODAY, fakeAi({ ok: true, output: bad }));
    expect(r).toEqual({ mode: "rule", reason: "invalid_output", draft: ruleDraft });
    expect(r.draft.fields.area).toBe("西屯、台中榮總");
    expect(r.draft.fields.gender).toBe("");
  });

  test("AI 的輸出少欄位 → 規則模式", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await extractFromChat(CHAT, TODAY, fakeAi({ ok: true, output: { customerName: "Mia" } }));
    expect(r).toEqual({ mode: "rule", reason: "invalid_output", draft: ruleDraft });
  });

  test("AI 呼叫本身丟錯 → 也照樣退回規則模式，不會讓整理失敗", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const callAi = vi.fn(async () => { throw new Error("boom"); });
    const r = await extractFromChat(CHAT, TODAY, callAi);
    expect(r).toEqual({ mode: "rule", reason: "api_error", draft: ruleDraft });
  });
});

describe("沒有金鑰", () => {
  test("規則模式正常運作，而且不寫 log（這是正常狀態）", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await extractFromChat(CHAT, TODAY, fakeAi({ ok: false, reason: "no_key" }));
    expect(r).toEqual({ mode: "rule", reason: "no_key", draft: ruleDraft });
    expect(log).not.toHaveBeenCalled();
  });
});

describe("log", () => {
  test("只記原因代碼和 HTTP 狀態，不含電話、對話內容", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await extractFromChat(CHAT, TODAY, fakeAi({ ok: false, reason: "rate_limited", status: 429 }));
    expect(log.mock.calls).toEqual([["paste ai fallback", "rate_limited", 429]]);

    log.mockClear();
    await extractFromChat(CHAT, TODAY, fakeAi({ ok: true, output: { ...validAiOutput(), leaseEnd: "不知道" } }));
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("invalid_output");
    for (const secret of ["0900", "Mia", "榮總", "護理師", "不知道"]) expect(logged).not.toContain(secret);
  });
});

describe("給房仲看的說明", () => {
  test("沒金鑰不另外說明（頁面本來就標示規則模式）；其他原因各有一句", () => {
    expect(pasteNotice(undefined)).toBeUndefined();
    expect(pasteNotice("no_key")).toBeUndefined();
    expect(pasteNotice("rate_limited")).toBe("AI 現在用得太頻繁，這次改用規則模式");
    expect(pasteNotice("refused")).toBe("AI 沒有處理這段內容，這次改用規則模式");
    expect(pasteNotice("invalid_output")).toBe("AI 回覆的格式不對，這次改用規則模式");
    expect(pasteNotice("truncated")).toBe("AI 回覆的格式不對，這次改用規則模式");
    for (const r of ["auth", "timeout", "connection", "api_error"] as const) expect(pasteNotice(r)).toBe("AI 暫時連不上，這次改用規則模式");
  });
});
