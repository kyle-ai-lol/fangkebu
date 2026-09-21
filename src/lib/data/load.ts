// 後台頁面共用的讀取（用房仲自己的登入狀態，RLS 只回傳自己的資料）。
import { redirect } from "next/navigation";
import { toClient, toViewing } from "../db/mappers";
import { computeReminders, todayInTaipei } from "../rules";
import { createClient, currentUserId } from "../supabase/server";
import { retryOnJwtClaims } from "./retry";

export async function requireSession() {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");
  return { supabase, userId };
}

/** 這位房仲全部的客人和約看，加上台灣的今天 */
export async function loadBook() {
  const { supabase, userId } = await requireSession();
  const [clientsRes, viewingsRes] = await Promise.all([
    retryOnJwtClaims(() => supabase.from("clients").select("*").order("updated_at", { ascending: false })),
    retryOnJwtClaims(() => supabase.from("viewings").select("*").order("starts_at")),
  ]);
  if (clientsRes.error || viewingsRes.error) throw new Error(`讀取客戶簿失敗（${(clientsRes.error ?? viewingsRes.error)!.code}）`);
  const now = new Date();
  return {
    supabase,
    userId,
    now,
    today: todayInTaipei(now),
    clients: clientsRes.data.map(toClient),
    viewings: viewingsRes.data.map(toViewing),
  };
}

export async function loadReminders() {
  const book = await loadBook();
  return { ...book, reminders: computeReminders(book) };
}
