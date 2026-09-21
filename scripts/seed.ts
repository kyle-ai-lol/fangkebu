// 本機示範帳號（只給本機開發用）：npm run db:seed
// 帳號 demo@fangkebu.test，密碼 demo-fangkebu。重跑會換成新的 9 位示範客戶（日期相對今天）。
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/database.types";
import { replaceDemoClients } from "../src/lib/data/demo-insert";

const EMAIL = "demo@fangkebu.test";
const PASSWORD = "demo-fangkebu";

async function main() {
  process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error("seed 只能對本機 Supabase 跑（.env.local 的網址不是本機）");
  }
  const admin = createClient<Database>(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  let user = list.users.find((u) => u.email === EMAIL);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: "示範房仲", areas: ["北區", "西屯", "北屯"], bot_name: "小幫手" },
    });
    if (error) throw error;
    user = data.user;
  }

  const n = await replaceDemoClients(admin, user.id);
  console.log(`示範帳號 ${EMAIL} / ${PASSWORD}，已放入 ${n} 位示範客戶`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
