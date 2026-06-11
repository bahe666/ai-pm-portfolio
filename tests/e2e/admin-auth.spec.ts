import { expect, test } from "@playwright/test";

test("anonymous visitors are redirected from admin to login", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "后台登录" })).toBeVisible();
  await expect(page.getByText("只允许白名单邮箱登录，不开放注册。")).toBeVisible();
});

test("public homepage does not expose an admin entry", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: /后台|Admin/i })).toHaveCount(0);
});
