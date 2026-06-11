import { expect, test } from "@playwright/test";

test("public homepage shows identity, projects and footer data note", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /你好，我是/ })).toBeVisible();
  await expect(page.getByText(/3 分钟认识我/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "精选项目预览" })).toBeVisible();
  await expect(page.getByRole("heading", { exact: true, name: "Agent 协作原型" })).toBeVisible();
  await expect(page.getByText(/匿名访问数据/)).toBeVisible();
});

test("project detail page renders PRD headings and demo link", async ({ page }) => {
  await page.goto("/projects/agent-collaboration-prototype");

  await expect(page.getByRole("heading", { exact: true, name: "Agent 协作原型" })).toBeVisible();
  await expect(page.getByRole("link", { name: "查看真实 Demo" })).toHaveAttribute(
    "href",
    "https://example.vercel.app"
  );
  await expect(page.getByRole("heading", { name: "Agent 协作原型 PRD" })).toBeVisible();
  await expect(page.getByRole("link", { name: "用户场景" })).toHaveAttribute("href", "#用户场景");
});
