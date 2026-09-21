import { defineConfig } from "vitest/config";

// 測試時模擬正式環境的伺服器時區（Vercel 是 UTC），確保「今天」的計算不依賴電腦時區。
process.env.TZ ??= "UTC";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
