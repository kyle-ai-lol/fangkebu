"use server";
// 整理對話：把貼上的 LINE 對話整理成草稿，再存成新客戶，或補進同一支電話的舊客戶卡。
// AI 只在伺服器上呼叫（src/lib/ai/），瀏覽器只拿到整理結果，拿不到金鑰。
// log 只記錯誤代碼：對話內容、客人電話都不能出現在 log。

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractFromChat, pasteNotice } from "@/lib/ai/extract-chat";
import { insertPasteClient, loadPasteMatches, mergePasteIntoClient, type PasteMatch } from "@/lib/data/paste";
import { draftAlias, isVagueArea, missingFields, todayInTaipei, type PasteDraft } from "@/lib/rules";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { firstError, pasteSaveSchema, pasteTextSchema } from "@/lib/validation";

export type PasteExtractResult =
  | {
      ok: true;
      /** rule = 這次是用簡單規則整理的（沒設定 AI 金鑰，或 AI 失敗） */
      mode: "ai" | "rule";
      /** AI 失敗時給房仲看的一句說明 */
      notice?: string;
      draft: PasteDraft;
      preview: { alias: string; raw: boolean; why?: string; missing: number; vague: boolean };
      /** 客戶簿裡同一支電話的客人（只比電話，不比名字） */
      matches: PasteMatch[];
    }
  | { ok: false; error: string };

export type PasteSaveResult = { ok: true; clientId: string; message: string } | { ok: false; error: string };

async function session() {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");
  return { supabase, userId };
}

export async function extractPasteAction(text: string): Promise<PasteExtractResult> {
  const p = pasteTextSchema.safeParse(text);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  // 先確認登入，再呼叫 AI
  const { supabase } = await session();
  const today = todayInTaipei();

  const { mode, reason, draft } = await extractFromChat(p.data, today);

  let matches: PasteMatch[];
  try {
    matches = await loadPasteMatches(supabase, draft.fields.phone, today);
  } catch (e) {
    console.error("paste match lookup failed", (e as Error).message);
    return { ok: false, error: "讀取客戶簿失敗，請再試一次。" };
  }

  const alias = draftAlias(draft, today);
  return {
    ok: true,
    mode,
    notice: pasteNotice(reason),
    draft,
    preview: {
      alias: alias.text || "新客人",
      raw: alias.raw,
      why: alias.why,
      missing: missingFields(draft).length,
      vague: isVagueArea(draft.fields.area),
    },
    matches,
  };
}

export async function savePasteAction(input: { draft: PasteDraft; mergeInto?: string }): Promise<PasteSaveResult> {
  // 草稿和 mergeInto 都是瀏覽器傳回來的，重新驗證
  const p = pasteSaveSchema.safeParse(input);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const { supabase, userId } = await session();
  const { draft, mergeInto } = p.data;

  const r = mergeInto
    ? await mergePasteIntoClient(supabase, userId, mergeInto, draft)
    : await insertPasteClient(supabase, userId, draft);
  if (!r.ok) {
    if (r.error === "not_found") return { ok: false, error: "找不到這位客戶，可能已經被刪除了。" };
    if (r.error === "phone_mismatch") return { ok: false, error: "電話不一樣，不能補進這位客戶的客戶卡。" };
    console.error("paste save failed", r.code);
    return { ok: false, error: "存檔失敗，請再試一次。" };
  }

  revalidatePath("/app", "layout");
  return { ok: true, clientId: r.clientId, message: mergeInto ? `補進 ${r.filled} 個欄位` : "已存進客戶簿" };
}
