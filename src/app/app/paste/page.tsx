import type { Metadata } from "next";
import { PasteBox } from "@/components/paste/PasteBox";
import { aiEnabled } from "@/lib/ai/anthropic";

export const metadata: Metadata = { title: "整理對話｜房客簿" };

// AI 整理最慢是 20 秒 × 2 次（含重試 1 次）；這一頁的伺服器動作最多給 60 秒
export const maxDuration = 60;

export default function PastePage() {
  // 只把「有沒有設定 AI 金鑰」傳給瀏覽器，金鑰本身留在伺服器
  return <PasteBox aiEnabled={aiEnabled()} />;
}
