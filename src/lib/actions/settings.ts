"use server";
// 設定頁：個人資料、AI 知識庫。

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { firstError, kbSchema, profileSchema } from "@/lib/validation";
import type { FormState } from "./auth";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

async function session() {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");
  return { supabase, userId };
}

export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const p = profileSchema.safeParse({
    name: str(formData.get("name")),
    company: str(formData.get("company")),
    phone: str(formData.get("phone")),
    areas: formData.getAll("areas").map(str),
    botName: str(formData.get("botName")),
  });
  if (!p.success) return { error: firstError(p.error) };
  const { supabase, userId } = await session();
  const { name, company, phone, areas, botName } = p.data;
  const { error } = await supabase.from("agents").update({ name, company, phone, areas, bot_name: botName }).eq("id", userId);
  if (error) {
    console.error("save profile failed", error.code);
    return { error: "儲存失敗，請再試一次。" };
  }
  revalidatePath("/app", "layout");
  return { message: "已儲存個人資料" };
}

export async function saveKbAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const reset = formData.get("intent") === "reset";
  const p = kbSchema.safeParse(str(formData.get("kb")));
  if (!reset && !p.success) return { error: firstError(p.error) };
  const { supabase, userId } = await session();
  // 還原 = 存成 null，畫面上改顯示示範內容
  const { error } = await supabase.from("agents").update({ kb: reset ? null : p.data! }).eq("id", userId);
  if (error) {
    console.error("save kb failed", error.code);
    return { error: "儲存失敗，請再試一次。" };
  }
  revalidatePath("/app/settings");
  return { message: reset ? "已還原成示範內容" : "已儲存知識庫" };
}
