"use client";
// 後台上方列：分頁、提醒數字、登出。「AI 接客測試」「整理對話」到階段 2、3 才加。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { signOut } from "@/lib/actions/auth";

const TABS = [
  ["/app/clients", "客戶簿"],
  ["/app/reminders", "提醒"],
  ["/app/settings", "設定"],
] as const;

export function AppTopbar({ agentName, urgent }: { agentName: string; urgent: number }) {
  const path = usePathname();
  return (
    <header className="topbar">
      <Brand label="回到房客簿介紹頁" />
      <nav className="tabs" aria-label="後台">
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} className="tab" aria-current={path.startsWith(href) ? "page" : undefined}>
            {label}
            {href === "/app/reminders" && urgent > 0 && <span className="badge">{urgent}</span>}
          </Link>
        ))}
      </nav>
      <span className="spacer" />
      <span className="who">{agentName}</span>
      <form action={signOut}>
        <button type="submit" className="btn ghost small">登出</button>
      </form>
    </header>
  );
}
