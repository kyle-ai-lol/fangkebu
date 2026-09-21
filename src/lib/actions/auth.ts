"use server";
// 註冊、登入、登出。

import { redirect } from "next/navigation";
import { replaceDemoClients } from "@/lib/data/demo-insert";
import { createClient } from "@/lib/supabase/server";
import { firstError, loginSchema, signupSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
  message?: string;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

/** Supabase 的錯誤代碼 → 中文。log 只記代碼，不記 email。 */
function authErrorCopy(code: string | undefined): string {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return "這個 Email 已經註冊過了，請直接登入。";
    case "weak_password":
      return "密碼太簡單了，換一組長一點的。";
    case "invalid_credentials":
      return "Email 或密碼不對。";
    case "email_not_confirmed":
      return "還沒完成信箱確認，請先到信箱收確認信。";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "操作太頻繁了，稍等一下再試。";
    default:
      console.error("auth error", code);
      return "登入服務暫時有問題，稍後再試。";
  }
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: str(formData.get("name")),
    company: str(formData.get("company")),
    phone: str(formData.get("phone")),
    areas: formData.getAll("areas").map(str),
    botName: str(formData.get("botName")),
    email: str(formData.get("email")).trim(),
    password: str(formData.get("password")),
    loadDemo: formData.get("loadDemo") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: { data: { name: d.name, company: d.company, phone: d.phone, areas: d.areas, bot_name: d.botName } },
  });
  if (error) return { error: authErrorCopy(error.code) };
  // 正式環境會開信箱確認：這時還沒有登入狀態，要等確認後再登入
  if (!data.session || !data.user) return { message: "註冊成功！請到信箱收確認信，確認後再回來登入。" };

  if (d.loadDemo) {
    try {
      await replaceDemoClients(supabase, data.user.id);
    } catch (e) {
      console.error("load demo on signup failed", (e as Error).message);
    }
  }
  redirect("/app/clients");
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: str(formData.get("email")).trim(), password: str(formData.get("password")) });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorCopy(error.code) };
  redirect("/app/clients");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
