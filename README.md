# 房客簿（暫定名）

給台中租屋房仲用的 SaaS。規格和開發規則在 [CLAUDE.md](CLAUDE.md)，介面、文案、規則邏輯以 [reference/prototype.html](reference/prototype.html) 為準。

## 常用指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發用網站，http://localhost:3000 |
| `npm test` | 業務規則單元測試（Vitest） |
| `npm run test:e2e` | 主要流程測試（Playwright，用電腦裡的 Edge） |
| `npm run lint`、`npm run typecheck` | 程式碼檢查 |

## 目錄

- `src/lib/rules/`：業務規則（代稱、行政區、提醒、約看、規則模式抽取），全部是純函式。`must-cases.test.ts` 是 CLAUDE.md 的必測案例。
- `e2e/`：Playwright 測試。
