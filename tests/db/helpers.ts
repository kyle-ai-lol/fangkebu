// 資料庫測試共用：用管理金鑰建立測試房仲，跑完刪掉。需要本機 Supabase。
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/db/database.types";

export type Db = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin: Db = createClient<Database>(url, secretKey, noSession);
const run = crypto.randomUUID().slice(0, 8);
const password = "rls-test-password-1";
const createdUsers: string[] = [];

/** 沒登入的連線 */
export function anonClient(): Db {
  return createClient<Database>(url, publishableKey, noSession);
}

/** 建立一位測試房仲並登入，回傳他的 id 和連線 */
export async function signUpAgent(label: string, metadata: Record<string, unknown> = { name: `測試房仲${label}` }) {
  const email = `rls-${label}-${run}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
  if (error) throw error;
  createdUsers.push(data.user.id);
  const db = anonClient();
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, db };
}

export type TestAgent = Awaited<ReturnType<typeof signUpAgent>>;

/** 刪掉這個測試檔建立的房仲（客戶、紀錄會跟著刪） */
export async function deleteTestAgents() {
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
}
