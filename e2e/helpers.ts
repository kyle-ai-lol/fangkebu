// E2E 共用：隨機測試帳號（跑完刪掉）。需要本機 Supabase。
import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

process.loadEnvFile(".env.local");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const PASSWORD = "e2e-password-1";
const run = crypto.randomUUID().slice(0, 8);
const emails: string[] = [];

export function testEmail(label: string) {
  const email = `e2e-${run}-${label}@example.test`;
  emails.push(email);
  return email;
}

export async function deleteTestUsers() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users) if (u.email && emails.includes(u.email)) await admin.auth.admin.deleteUser(u.id);
}

export async function signUp(page: Page, label: string, { demo }: { demo: boolean }) {
  await page.goto("/signup");
  await page.getByLabel("你的名字（客人會看到）").fill(`測試房仲${label.toUpperCase()}`);
  await page.getByLabel("Email（登入用）").fill(testEmail(label));
  await page.getByLabel("密碼（至少 8 個字）").fill(PASSWORD);
  const demoBox = page.getByLabel("先放入示範客戶，看看後台長什麼樣子");
  if (demo) await demoBox.check();
  else await demoBox.uncheck();
  await page.getByRole("button", { name: "建立後台" }).click();
  await expect(page).toHaveURL(/\/app\/clients/, { timeout: 30_000 });
}
