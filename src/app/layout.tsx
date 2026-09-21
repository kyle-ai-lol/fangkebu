import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "房客簿｜把 LINE 對話整理成客戶卡",
  description: "給台中租屋房仲用的客戶簿：AI 先回覆 LINE 客人、問齊找房條件，自動整理成客戶卡。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW">
      <body>{children}</body>
    </html>
  );
}
