import { expect, test } from "@playwright/test";

test("首頁打得開", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/房客簿/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("房客簿");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-TW");
});
