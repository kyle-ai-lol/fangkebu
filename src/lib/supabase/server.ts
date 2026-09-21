// 伺服器端的 Supabase 連線（照 Next.js 官方 with-supabase 範例）。
// 每次用都要重新建立，不要放在全域變數。
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // 在 Server Component 裡呼叫時會失敗，可以忽略：proxy 會負責更新登入狀態。
          }
        },
      },
    },
  );
}

/** 目前登入的房仲 id；沒登入回傳 null。用 getClaims() 驗證，不用 getSession()。 */
export async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}
