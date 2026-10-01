import "server-only";
// 唯一會 import Anthropic SDK、讀 ANTHROPIC_API_KEY 的檔案。
// 金鑰只在伺服器上用：不回傳給瀏覽器、不寫進 log。前端元件 import 到這個檔案，build 會直接失敗。

import Anthropic, {
  APIConnectionError, APIConnectionTimeoutError, APIError, AuthenticationError, PermissionDeniedError, RateLimitError,
} from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Ymd } from "../rules";
import { PASTE_SYSTEM_PROMPT, pasteUserMessage } from "./prompt";
import { aiPasteSchema } from "./schema";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
/** 單次請求最多等 20 秒，失敗重試 1 次；再不行就改用規則模式 */
const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 1;
/** 輸出只是一小段 JSON（約 300 token），留很寬 */
const MAX_OUTPUT_TOKENS = 4096;

/** AI 沒辦法用的原因。只有這個代碼會寫進 log。 */
export type AiFailure =
  | "no_key" | "auth" | "rate_limited" | "timeout" | "connection" | "api_error"
  | "refused" | "truncated" | "invalid_output";

export type AiCallResult =
  | { ok: true; output: unknown }
  | { ok: false; reason: AiFailure; status?: number };

function apiKey(): string {
  return (process.env.ANTHROPIC_API_KEY ?? "").trim();
}

/** 有沒有設定 AI 金鑰。只回傳有或沒有，金鑰本身不會離開這個檔案。 */
export function aiEnabled(): boolean {
  return apiKey() !== "";
}

/** SDK 丟出來的錯誤 → 原因代碼 */
export function failureOf(e: unknown): { reason: AiFailure; status?: number } {
  if (e instanceof APIConnectionTimeoutError) return { reason: "timeout" };
  if (e instanceof APIConnectionError) return { reason: "connection" };
  if (e instanceof AuthenticationError || e instanceof PermissionDeniedError) return { reason: "auth", status: e.status };
  if (e instanceof RateLimitError) return { reason: "rate_limited", status: e.status };
  if (e instanceof APIError) return { reason: "api_error", status: e.status };
  return { reason: "api_error" };
}

/**
 * 請 AI 整理一段 LINE 對話。不會丟錯：任何失敗都回傳原因代碼。
 * 回傳的 output 還沒驗證，要再過 parseAiPaste()。
 */
export async function callPasteAi(text: string, today: Ymd): Promise<AiCallResult> {
  const key = apiKey();
  if (!key) return { ok: false, reason: "no_key" };
  try {
    // authToken: null → 只認 ANTHROPIC_API_KEY 這一把，環境裡就算另外有登入憑證也不用
    const client = new Anthropic({ apiKey: key, authToken: null, timeout: TIMEOUT_MS, maxRetries: MAX_RETRIES });
    // 不帶 thinking、effort：預設的 Haiku 4.5 不吃，之後換模型也相容
    const message = await client.messages.create({
      model: process.env.AI_MODEL?.trim() || DEFAULT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: PASTE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: pasteUserMessage(text, today) }],
      output_config: { format: zodOutputFormat(aiPasteSchema) },
    });
    // 先看停止原因再讀內容：拒答或被截斷時，內容不保證符合結構
    if (message.stop_reason === "refusal") return { ok: false, reason: "refused" };
    if (message.stop_reason === "max_tokens") return { ok: false, reason: "truncated" };
    const block = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    try {
      return { ok: true, output: JSON.parse(block?.text ?? "") };
    } catch {
      return { ok: false, reason: "invalid_output" };
    }
  } catch (e) {
    return { ok: false, ...failureOf(e) };
  }
}
