// 貼上對話整理的流程：先試 AI；沒金鑰、API 出錯、拒答、輸出不合格，
// 任何一種都整份改用規則模式（src/lib/rules/extract.ts），不混用半份 AI 結果。

import { draftFromExtracted, guessNameFromChat, ruleExtract, type PasteDraft, type Ymd } from "../rules";
import { callPasteAi, type AiCallResult, type AiFailure } from "./anthropic";
import { parseAiPaste } from "./schema";

export interface PasteExtraction {
  mode: "ai" | "rule";
  /** 為什麼沒用 AI（mode 是 rule 才有） */
  reason?: AiFailure;
  draft: PasteDraft;
}

export type CallPasteAi = (text: string, today: Ymd) => Promise<AiCallResult>;

export async function extractFromChat(text: string, today: Ymd, callAi: CallPasteAi = callPasteAi): Promise<PasteExtraction> {
  let reason: AiFailure;
  let status: number | undefined;
  try {
    const ai = await callAi(text, today);
    if (ai.ok) {
      const parsed = parseAiPaste(ai.output);
      if (parsed) return { mode: "ai", draft: draftFromExtracted(parsed) };
      reason = "invalid_output";
    } else {
      reason = ai.reason;
      status = ai.status;
    }
  } catch {
    reason = "api_error";
  }
  // log 只記原因代碼和 HTTP 狀態：對話內容、客人電話都不能出現在 log。
  // 沒設定金鑰是正常狀態，不用記。
  if (reason !== "no_key") console.error("paste ai fallback", reason, status ?? "");
  const rule = ruleExtract(text, today);
  return { mode: "rule", reason, draft: draftFromExtracted({ ...rule, name: guessNameFromChat(text) }) };
}

/** 這次為什麼改用規則模式，給房仲看的一句話。沒設定金鑰時頁面本來就標示規則模式，不用另外說明。 */
export function pasteNotice(reason: AiFailure | undefined): string | undefined {
  switch (reason) {
    case undefined:
    case "no_key":
      return undefined;
    case "rate_limited":
      return "AI 現在用得太頻繁，這次改用規則模式";
    case "refused":
      return "AI 沒有處理這段內容，這次改用規則模式";
    case "truncated":
    case "invalid_output":
      return "AI 回覆的格式不對，這次改用規則模式";
    default:
      return "AI 暫時連不上，這次改用規則模式";
  }
}
