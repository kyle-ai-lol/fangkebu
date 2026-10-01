import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 測試時模擬正式環境的伺服器時區（Vercel 是 UTC），確保「今天」的計算不依賴電腦時區。
process.env.TZ ??= "UTC";

export default defineConfig({
  resolve: {
    alias: {
      // "server-only" 在 Next.js 以外的環境一 import 就丟錯，測試裡換成它自己附的空檔案
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // 擋下所有連到 Anthropic API 的請求
    setupFiles: ["tests/setup/no-real-ai.ts"],
  },
});
