// 主要流程：註冊 → 建客人 → 代稱 → 約看 → 提醒；另一位房仲看不到。需要本機 Supabase。
// 測試帳號用隨機 email，跑完用管理金鑰刪掉。
import { expect, test, type Page } from "@playwright/test";
import { deleteTestUsers, PASSWORD, signUp, testEmail } from "./helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.afterAll(deleteTestUsers);

/** 台灣時間的明天 YYYY-MM-DD */
function taipeiTomorrow(): string {
  return new Date(Date.now() + 8 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
}

async function setField(page: Page, key: string, value: string) {
  const input = page.locator(`input[data-field="${key}"]`);
  await input.fill(value);
  await input.press("Tab"); // 離開欄位就存檔
}

let aClientUrl = "";

test("註冊沒填名字會提示", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email（登入用）").fill(testEmail("noname"));
  await page.getByLabel("密碼（至少 8 個字）").fill(PASSWORD);
  await page.getByRole("button", { name: "建立後台" }).click();
  await expect(page.locator(".err[role=alert]")).toHaveText("請填你的名字，AI 回覆客人時會用到。");
});

test("A 房仲：新增客人 → 填條件出現代稱 → 排約看自動變已約看 → 提醒頁出現", async ({ page }) => {
  await signUp(page, "a", { demo: false });
  await expect(page.getByText("客戶簿還是空的。")).toBeVisible();

  await page.getByRole("button", { name: "新增客戶" }).first().click();
  await expect(page).toHaveURL(/open=/);
  aClientUrl = page.url();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("原本稱呼").fill("小周");
  await dialog.getByLabel("原本稱呼").press("Tab");
  await setField(page, "area", "北區");
  await setField(page, "budget", "1 萬以內");
  await setField(page, "job", "工程師");
  await expect(dialog.locator(".d-title .stamp")).toHaveText("未北區10000");

  await dialog.getByLabel("日期時間").fill(`${taipeiTomorrow()}T19:00`);
  await dialog.getByLabel("物件地址").fill("北區示範路 12 號 3F");
  await dialog.getByRole("button", { name: "加入約看" }).click();
  await expect(page.locator("#toast")).toHaveText("記得跟客人要電話，再寫進第 6 項");
  await expect(dialog.getByLabel("階段")).toHaveValue("已約看");
  await expect(dialog.locator(".log")).toContainText("階段：新詢問 → 已約看");
  await expect(dialog.getByRole("link", { name: "加到 Google 日曆" })).toHaveAttribute("href", /%E5%B8%B6%E7%9C%8B%EF%BD%9C%E6%9C%AA%E5%8C%97%E5%8D%8010000/);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator(".lrow")).toHaveCount(1);
  await expect(page.locator(".lrow .stage")).toHaveText("已約看");

  await page.getByRole("link", { name: /提醒/ }).click();
  const item = page.locator(".ritem", { hasText: "未北區10000：明天 19:00 帶看 北區示範路 12 號 3F" });
  await expect(item).toBeVisible();
  await expect(item).toContainText("還沒有電話，帶看前先跟客人要");
  await expect(page.locator(".tab .badge")).toHaveText("1");
});

test("B 房仲登入後看不到 A 的客人，直接開 A 的客戶卡網址也打不開", async ({ page }) => {
  await signUp(page, "b", { demo: false });
  await expect(page.getByText("客戶簿還是空的。")).toBeVisible();
  await page.goto(aClientUrl);
  await expect(page.getByText("客戶簿還是空的。")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("註冊時放入示範客戶：代稱、看板、提醒都照規則", async ({ page }) => {
  await signUp(page, "c", { demo: true });
  const rows = page.locator(".lrow");
  await expect(rows).toHaveCount(8); // 未結案：郭先生已成交不算
  for (const alias of ["未北區8000-工程", "未北區8000-護理", "未北區7500", "未8500", "Leo"]) {
    await expect(page.locator(".lrow .stamp", { hasText: alias }).first()).toBeVisible();
  }
  await page.getByRole("button", { name: "已結案" }).click();
  await expect(page.locator(".lrow .stamp")).toHaveText(["已南屯10000"]);
  await page.getByRole("button", { name: "全部" }).click();
  await expect(rows).toHaveCount(9);
  await page.getByRole("searchbox", { name: "搜尋客戶" }).fill("0900-000-107");
  await expect(page.locator(".lrow .stamp")).toHaveText(["未北區8000-護理"]);

  await page.goto("/app/reminders");
  await expect(page.locator(".ritem").first()).toHaveAttribute("data-kind", "handoff");
  await expect(page.locator('.ritem[data-kind="lease"]')).toContainText("已經晚了 2 天");
});
