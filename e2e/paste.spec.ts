// 整理對話（規則模式）：貼上 → 存成新客戶 → 同電話再貼 → 補進舊客戶卡；同名不同電話不提示；別的房仲對不到。
// 需要本機 Supabase。只測規則模式，不會呼叫 AI：Playwright 啟動的伺服器不帶 AI 金鑰（見 playwright.config.ts）；
// 如果沿用到一台帶著金鑰的 dev server，openPaste() 會在送出任何對話之前讓測試失敗。
import { expect, test, type Page } from "@playwright/test";
import { deleteTestUsers, signUp } from "./helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.afterAll(deleteTestUsers);

const SAME_PHONE = ["Mia：我想改成北屯也可以，預算 1 萬 2", "Mia：電話一樣 0900 000 777，我是女生，26 歲"].join("\n");
const SAME_NAME_OTHER_PHONE = ["Mia：你好，想找北區的套房，預算 8000", "Mia：我的電話 0900-000-778"].join("\n");

async function openPaste(page: Page) {
  await page.getByRole("link", { name: "整理對話" }).click();
  await expect(page).toHaveURL(/\/app\/paste$/);
  await expect(
    page.locator(".toolbar .pill"),
    "E2E 只測規則模式：請關掉正在跑的 dev server（它帶著 AI 金鑰），讓 Playwright 自己啟動一台",
  ).toHaveText("目前為規則模式");
}

async function organize(page: Page, text: string) {
  await page.getByLabel("LINE 對話紀錄").fill(text);
  await page.getByRole("button", { name: "整理成客戶卡" }).click();
  await expect(page.getByRole("heading", { name: "整理結果（規則模式）" })).toBeVisible();
}

const previewValue = (page: Page, key: string) => page.locator(`.frow[data-field="${key}"] .fval`);
const drawerField = (page: Page, key: string) => page.getByRole("dialog").locator(`input[data-field="${key}"]`);

async function closeDrawer(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

test("A 房仲：貼上對話存成新客戶 → 同電話再貼一次只補空白 → 同名不同電話不提示合併", async ({ page }) => {
  await signUp(page, "pa", { demo: false });

  // 空白的客戶簿有入口
  await page.getByRole("link", { name: "貼上 LINE 對話" }).click();
  await expect(page).toHaveURL(/\/app\/paste$/);
  await page.getByRole("link", { name: "客戶簿" }).click();
  await openPaste(page);
  await expect(page.getByText("目前為規則模式：還沒接上 AI")).toBeVisible();

  // 沒貼東西不會送出
  await page.getByRole("button", { name: "整理成客戶卡" }).click();
  await expect(page.locator("#toast")).toHaveText("先貼上一段對話");

  // 1. 示範對話 → 整理結果 → 存成新客戶
  await page.getByRole("button", { name: "貼上示範對話" }).click();
  await page.getByRole("button", { name: "整理成客戶卡" }).click();
  await expect(page.getByRole("heading", { name: "整理結果（規則模式）" })).toBeVisible();
  await expect(previewValue(page, "phone")).toHaveText("0900-000-777");
  await expect(previewValue(page, "budget")).toHaveText("10000");
  await expect(previewValue(page, "area")).toHaveText("西屯、台中榮總");
  await expect(previewValue(page, "gender")).toHaveText("還沒問");
  await expect(page.locator(".cv-head .miss")).toHaveText("還缺 3 項");
  await expect(page.getByText(/現租約到期：\d{4}-10-31/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^補進/ })).toHaveCount(0);

  await page.getByRole("button", { name: "存進客戶簿" }).click();
  await expect(page.locator("#toast")).toHaveText("已存進客戶簿");
  await expect(page).toHaveURL(/\/app\/clients\?open=/);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("原本稱呼")).toHaveValue("Mia");
  await expect(dialog.getByLabel("階段")).toHaveValue("資料蒐集中");
  await expect(drawerField(page, "phone")).toHaveValue("0900-000-777");
  await expect(dialog.locator(".log")).toContainText("建立客戶卡（貼上整理）");
  await closeDrawer(page);
  await expect(page.locator(".lrow")).toHaveCount(1);

  // 2. 同一支電話再貼一段 → 提示補進舊客戶卡；補進去只填空白，不覆蓋
  await openPaste(page);
  await organize(page, SAME_PHONE);
  await expect(previewValue(page, "budget")).toHaveText("12000");
  await expect(page.getByText("客戶簿裡已經有同一支電話的客人。")).toBeVisible();
  await expect(page.getByRole("button", { name: "另存成新客戶" })).toBeVisible();
  await page.getByRole("button", { name: /^補進「.+」的客戶卡$/ }).click();
  await expect(page.locator("#toast")).toHaveText("補進 2 個欄位");
  await expect(dialog).toBeVisible();
  await expect(drawerField(page, "budget")).toHaveValue("10000");
  await expect(drawerField(page, "area")).toHaveValue("西屯、台中榮總");
  await expect(drawerField(page, "gender")).toHaveValue("女");
  await expect(drawerField(page, "age")).toHaveValue("26 歲");
  await expect(dialog.locator(".log")).toContainText("貼上對話補了 2 個欄位");
  await expect(dialog.locator(".log")).toContainText("和原本不同、沒有覆蓋：地區 北屯（原本 西屯、台中榮總）、預算 12000（原本 10000）");
  await closeDrawer(page);
  await expect(page.locator(".lrow")).toHaveCount(1);

  // 3. 名字一樣、電話不同 → 不提示合併，只能存成新客戶
  await openPaste(page);
  await organize(page, SAME_NAME_OTHER_PHONE);
  await expect(previewValue(page, "phone")).toHaveText("0900-000-778");
  await expect(page.getByRole("button", { name: /^補進/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "另存成新客戶" })).toHaveCount(0);
  await page.getByRole("button", { name: "存進客戶簿" }).click();
  await expect(dialog).toBeVisible();
  await closeDrawer(page);
  await expect(page.locator(".lrow")).toHaveCount(2);
});

test("B 房仲貼上同一支電話 → 對不到 A 的客人，不提示合併", async ({ page }) => {
  await signUp(page, "pb", { demo: false });
  await openPaste(page);
  await page.getByRole("button", { name: "貼上示範對話" }).click();
  await page.getByRole("button", { name: "整理成客戶卡" }).click();
  await expect(page.getByRole("heading", { name: "整理結果（規則模式）" })).toBeVisible();
  await expect(previewValue(page, "phone")).toHaveText("0900-000-777");
  await expect(page.getByRole("button", { name: /^補進/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "存進客戶簿" })).toBeVisible();
});

test("超過 12,000 字 → 提示分段，不送出", async ({ page }) => {
  await signUp(page, "pc", { demo: false });
  await openPaste(page);
  await page.getByLabel("LINE 對話紀錄").fill("想找北區的套房。".repeat(1600));
  await expect(page.locator(".err[role=alert]")).toContainText("對話太長了（最多 12,000 字），請分段貼上");
  await page.getByRole("button", { name: "整理成客戶卡" }).click();
  await expect(page.locator("#toast")).toHaveText("對話太長了（最多 12,000 字），請分段貼上");
  await expect(page.getByRole("heading", { name: /整理結果/ })).toHaveCount(0);
});
