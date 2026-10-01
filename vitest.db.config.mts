import { defineConfig } from "vitest/config";

// 資料庫測試：要先 `npx supabase start`，金鑰從 .env.local 讀。
process.loadEnvFile(".env.local");

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // .env.local 之後會有真的 ANTHROPIC_API_KEY：擋下所有連到 Anthropic API 的請求
    setupFiles: ["tests/setup/no-real-ai.ts"],
  },
});
