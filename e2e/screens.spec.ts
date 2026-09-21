// 畫面檢查：電腦／手機 × 淺色／深色，每頁截圖到 test-results/screens/，
// 並確認手機寬度沒有左右捲動。只在 SCREENS=1 時跑：npx cross-env 不用裝，直接 `SCREENS=1 npx playwright test screens`
import { expect, test, type Page } from "@playwright/test";
import { deleteTestUsers, signUp } from "./helpers";

test.skip(!process.env.SCREENS, "設定 SCREENS=1 才跑（產生截圖給人看）");
test.setTimeout(180_000);
test.afterAll(deleteTestUsers);

const VIEWPORTS = { desktop: { width: 1280, height: 800 }, mobile: { width: 375, height: 812 } } as const;

async function noHorizontalScroll(page: Page, what: string) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, `${what}：頁面寬 ${scroll} > 視窗寬 ${client}`).toBeLessThanOrEqual(client + 1);
}

for (const scheme of ["light", "dark"] as const) {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test(`${device} ${scheme}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, colorScheme: scheme });
      const page = await context.newPage();
      const shot = (name: string, fullPage = true) =>
        page.screenshot({ path: `test-results/screens/${device}-${scheme}-${name}.png`, fullPage });

      await page.goto("/");
      await page.waitForTimeout(6000); // 等首頁動畫跑完
      await noHorizontalScroll(page, "首頁");
      await shot("landing");

      await signUp(page, `${device}-${scheme}`, { demo: true });
      await expect(page.locator(".lrow")).toHaveCount(8);
      await noHorizontalScroll(page, "客戶簿列表");
      await shot("clients");

      await page.getByRole("button", { name: "依階段" }).click();
      await noHorizontalScroll(page, "看板");
      await shot("board", false);

      await page.getByRole("button", { name: "列表" }).click();
      await page.locator(".lrow", { hasText: "未北區8000-護理" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await noHorizontalScroll(page, "客戶卡");
      await shot("drawer", false);

      await page.goto("/app/reminders");
      await noHorizontalScroll(page, "提醒");
      await shot("reminders");

      await page.goto("/app/settings");
      await noHorizontalScroll(page, "設定");
      await shot("settings", false);
      await context.close();
    });
  }
}
