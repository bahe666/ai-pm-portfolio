import { expect, test } from "@playwright/test";

test("renders the public homepage", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI PM Portfolio" })).toBeVisible();
  await expect(page.getByText(/如果你只有 3 分钟认识我/)).toBeVisible();
});
