import type { Metadata } from "next";
import { SettingsForms } from "@/components/settings/SettingsForms";
import { requireSession } from "@/lib/data/load";
import { retryOnJwtClaims } from "@/lib/data/retry";
import { DEFAULT_KB } from "@/lib/defaults";

export const metadata: Metadata = { title: "設定｜房客簿" };

export default async function SettingsPage() {
  const { supabase, userId } = await requireSession();
  const { data: agent, error } = await retryOnJwtClaims(() => supabase.from("agents").select("*").eq("id", userId).single());
  if (error) throw new Error(`讀取設定失敗（${error.code}）`);
  return (
    <SettingsForms
      profile={{ name: agent.name, company: agent.company, phone: agent.phone, areas: agent.areas, botName: agent.bot_name }}
      kb={agent.kb ?? DEFAULT_KB}
    />
  );
}
