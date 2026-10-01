# 房客簿（暫定名）

給台中租屋房仲用的 SaaS。規格和開發規則在 [CLAUDE.md](CLAUDE.md)，介面、文案、規則邏輯以 [reference/prototype.html](reference/prototype.html) 為準。

## 本機開發

1. 開 Docker Desktop（只在開發時開）。沒正常關閉的話，下次可能出現 `dockerInference` 或 `engine.sock` 啟動錯誤，請找 Claude 處理。
2. `npm run db:start`：啟動本機 Supabase。資料庫管理介面在 http://127.0.0.1:54323
3. `npm run db:seed`：建立本機示範帳號 `demo@fangkebu.test`（密碼 `demo-fangkebu`）和 9 位示範客戶
4. `npm run dev`：網站在 http://localhost:3200（3000 給 TREK 用了）
5. 不用時 `npm run db:stop`，資料會保留

改資料表：在 `supabase/migrations/` 新增一個 SQL 檔，然後依序跑 `npm run db:reset`（會清空本機資料）、`npm run db:types`、`npm run db:seed`。

## 整理對話（AI 模式／規則模式）

後台的「整理對話」把貼上的 LINE 對話整理成客戶卡。

- **沒有 AI 金鑰**：`.env.local` 的 `ANTHROPIC_API_KEY` 留空，整個功能用規則模式跑（`src/lib/rules/extract.ts`），頁面會標示「目前為規則模式」。
- **有 AI 金鑰**：把金鑰填進 `.env.local` 的 `ANTHROPIC_API_KEY`，重開 `npm run dev` 就變成 AI 模式，不用改程式。申請位置寫在 `.env.example`。
- AI 只在伺服器上呼叫（`src/lib/ai/anthropic.ts`），金鑰不會到瀏覽器。AI 出錯、拒答或輸出不合格時，那一次整份改用規則模式，畫面會寫「整理結果（規則模式）」和原因。
- 只有電話相同（去掉符號後完全一樣、至少 8 碼）才會提示「補進舊客戶卡」；名字一樣不算。補進去只填空白欄位，不覆蓋原本的資料。

## 測試

| 指令 | 用途 |
|---|---|
| `npm test` | 業務規則和 AI 層的單元測試（Vitest），不用開資料庫 |
| `npm run test:db` | 多租戶測試：B 房仲讀不到、改不到 A 房仲的資料（要先 `npm run db:start`） |
| `npm run test:e2e` | 主要流程測試（Playwright，用電腦裡的 Edge；要先 `npm run db:start`） |
| `SCREENS=1 npx playwright test screens` | 電腦／手機 × 淺色／深色截圖，存到 `test-results/screens/` |
| `npm run lint`、`npm run typecheck` | 程式碼檢查 |

測試不會真的打 Anthropic API，就算 `.env.local` 有金鑰也一樣：

- 單元測試的 AI 呼叫都是假的；`tests/setup/no-real-ai.ts` 另外擋下所有連到 anthropic.com 的請求，漏了 mock 也送不出去。
- E2E 只測規則模式：Playwright 自己啟動的伺服器不帶金鑰（`playwright.config.ts`）。如果你的 `npm run dev` 正開著而且帶著金鑰，`e2e/paste.spec.ts` 會在送出對話前失敗，請先關掉 dev server 再跑。

## 目錄

- `src/lib/rules/`：業務規則（代稱、行政區、提醒、約看、規則模式抽取、電話比對、貼上整理的合併），全部是純函式。`must-cases.test.ts` 是 CLAUDE.md 的必測案例。
- `src/lib/ai/`：AI 整理對話。`anthropic.ts` 是唯一碰 SDK 和金鑰的檔案；`schema.ts` 是 AI 輸出的 zod 結構；`extract-chat.ts` 負責失敗時退回規則模式。
- `src/lib/actions/`：伺服器動作（註冊登入、客戶卡、設定、整理對話），寫入前都經過 `src/lib/validation.ts`（zod）。
- `src/lib/data/`：頁面讀資料、放入示範客戶、貼上整理的存檔。
- `supabase/migrations/`：資料表和 RLS 規則。
- `tests/db/`：RLS 多租戶測試。`e2e/`：Playwright 測試。`scripts/seed.ts`：本機示範資料。
