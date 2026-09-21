import type { Metadata } from "next";
import { LXGW_WenKai_TC, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

// 原型用的兩款字：楷體（手寫感的代稱印章、標題）＋黑體（內文）。中文字檔很大，不預先載入。
const wenkai = LXGW_WenKai_TC({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-wenkai", display: "swap", preload: false });
const noto = Noto_Sans_TC({ subsets: ["latin"], variable: "--font-noto", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "房客簿｜把 LINE 對話整理成客戶卡",
  description: "給台中租屋房仲用的客戶簿：AI 先回覆 LINE 客人、問齊找房條件，自動整理成客戶卡。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW" className={`${wenkai.variable} ${noto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
