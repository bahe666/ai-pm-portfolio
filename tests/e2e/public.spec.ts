import { expect, test } from "@playwright/test";

test("renders the public homepage", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/3 分钟认识我/)).toBeVisible();
});
