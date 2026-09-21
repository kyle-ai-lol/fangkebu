import { defineConfig } from "@playwright/test";

const PORT = 3200; // 和 npm run dev 同一個；已經開著就直接沿用

// 流程測試要先開本機 Supabase（npm run db:start）。
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // 用電腦已經裝好的 Edge，不另外下載瀏覽器
    channel: "msedge",
  },
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
