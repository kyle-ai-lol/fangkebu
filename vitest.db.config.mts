import { defineConfig } from "vitest/config";

// 資料庫測試：要先 `npx supabase start`，金鑰從 .env.local 讀。
process.loadEnvFile(".env.local");

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
