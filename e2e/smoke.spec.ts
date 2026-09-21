import { expect, test } from "@playwright/test";

test("首頁打得開", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/房客簿/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("客人在 LINE 講的每一句，都自動寫進客戶卡。");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-TW");
});

test("沒登入進後台會被導去登入頁", async ({ page }) => {
  await page.goto("/app/clients");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("登入");
});
