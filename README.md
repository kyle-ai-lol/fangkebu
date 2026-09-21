# 房客簿（暫定名）

給台中租屋房仲用的 SaaS。規格和開發規則在 [CLAUDE.md](CLAUDE.md)，介面、文案、規則邏輯以 [reference/prototype.html](reference/prototype.html) 為準。

## 本機開發

1. 開 Docker Desktop（只在開發時開）。沒正常關閉的話，下次可能出現 `dockerInference` 或 `engine.sock` 啟動錯誤，請找 Claude 處理。
2. `npm run db:start`：啟動本機 Supabase。資料庫管理介面在 http://127.0.0.1:54323
3. `npm run db:seed`：建立本機示範帳號 `demo@fangkebu.test`（密碼 `demo-fangkebu`）和 9 位示範客戶
4. `npm run dev`：網站在 http://localhost:3200（3000 給 TREK 用了）
5. 不用時 `npm run db:stop`，資料會保留

改資料表：在 `supabase/migrations/` 新增一個 SQL 檔，然後依序跑 `npm run db:reset`（會清空本機資料）、`npm run db:types`、`npm run db:seed`。

## 測試

| 指令 | 用途 |
|---|---|
| `npm test` | 業務規則單元測試（Vitest），不用開資料庫 |
| `npm run test:db` | 多租戶測試：B 房仲讀不到、改不到 A 房仲的資料（要先 `npm run db:start`） |
| `npm run test:e2e` | 主要流程測試（Playwright，用電腦裡的 Edge；要先 `npm run db:start`） |
| `SCREENS=1 npx playwright test screens` | 電腦／手機 × 淺色／深色截圖，存到 `test-results/screens/` |
| `npm run lint`、`npm run typecheck` | 程式碼檢查 |

## 目錄

- `src/lib/rules/`：業務規則（代稱、行政區、提醒、約看、規則模式抽取），全部是純函式。`must-cases.test.ts` 是 CLAUDE.md 的必測案例。
- `src/lib/actions/`：伺服器動作（註冊登入、客戶卡、設定），寫入前都經過 `src/lib/validation.ts`（zod）。
- `src/lib/data/`：頁面讀資料、放入示範客戶。
- `supabase/migrations/`：資料表和 RLS 規則。
- `tests/db/`：RLS 多租戶測試。`e2e/`：Playwright 測試。`scripts/seed.ts`：本機示範資料。
