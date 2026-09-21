import { AppTopbar } from "@/components/AppTopbar";
import { ToastProvider } from "@/components/Toast";
import { loadReminders } from "@/lib/data/load";
import { retryOnJwtClaims } from "@/lib/data/retry";
import { urgentCount } from "@/lib/rules";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { supabase, userId, reminders } = await loadReminders();
  const { data: agent } = await retryOnJwtClaims(() => supabase.from("agents").select("name").eq("id", userId).single());

  return (
    <ToastProvider>
      <AppTopbar agentName={agent?.name || "房仲"} urgent={urgentCount(reminders)} />
      <main className="app-main">{children}</main>
    </ToastProvider>
  );
}
