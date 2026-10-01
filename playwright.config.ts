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
    // 測試不能真的打 Anthropic API：這裡把金鑰設成空的，.env.local 就算有金鑰也不會蓋過來，
    // 「整理對話」固定跑規則模式。沿用已經開著的 dev server 時這行管不到，
    // 所以 e2e/paste.spec.ts 送出對話前還會再確認畫面是規則模式。
    env: { ANTHROPIC_API_KEY: "" },
  },
});
