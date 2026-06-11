import { expect, test } from "@playwright/test";

test("anonymous visitors are redirected from admin to login", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "后台登录" })).toBeVisible();
  await expect(page.getByText("只允许白名单邮箱登录，不开放注册。")).toBeVisible();
});

test("anonymous visitors are redirected from admin analytics to login", async ({ page }) => {
  await page.goto("/admin/analytics");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "后台登录" })).toBeVisible();
});

test("public homepage does not expose an admin entry", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: /后台|Admin/i })).toHaveCount(0);
  const protectedHrefs = await page.locator("a").evaluateAll((links) =>
    links
      .map((link) => link.getAttribute("href") ?? "")
      .filter((href) => href.includes("/admin") || href.includes("/login"))
  );

  expect(protectedHrefs).toEqual([]);
});
