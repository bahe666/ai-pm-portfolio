import { expect, test } from "@playwright/test";

test("public homepage shows identity, projects and footer data note", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /你好，我是/ })).toBeVisible();
  await expect(page.getByText(/3 分钟认识我/)).toBeVisible();
  await expect(page.getByText(/这里整理了我上一段实习中的部分原型 Demo、PRD 和项目思考/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "精选项目预览" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "履历快照" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "项目经历" })).toBeVisible();
  await expect(page.getByRole("heading", { exact: true, name: "Agent 协作原型" })).toBeVisible();
  await expect(page.getByText("教育背景")).toBeVisible();
  await expect(page.getByText("实习经历")).toBeVisible();
  await expect(page.getByText("项目证据")).toBeVisible();
  await expect(page.getByText(/匿名访问数据/)).toBeVisible();

  await expect(page.getByText("能力链")).toHaveCount(0);
  await expect(page.getByText(/按项目顺序快速扫读/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "轻量经历摘要" })).toHaveCount(0);
  await expect(page.getByText("当前身份")).toHaveCount(0);
  await expect(page.getByText("求职方向")).toHaveCount(0);
  await expect(page.getByText("作品集内容")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /下载.*简历|简历.*下载|简历 PDF/ })).toHaveCount(0);
});

test("project detail page renders PRD headings and demo link", async ({ page }) => {
  await page.goto("/projects/agent-collaboration-prototype");

  await expect(page.getByRole("link", { name: "返回作品集首页" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("heading", { exact: true, name: "Agent 协作原型" })).toBeVisible();
  await expect(page.getByRole("img", { name: /原型截图|首页预览/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "我的贡献" })).toBeVisible();
  await expect(page.getByText("拆解协作流程，搭建原型页面，沉淀 PRD 结构。")).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI 工作流说明" })).toBeVisible();
  await expect(page.getByText("使用 AI 辅助流程拆解、交互草稿和前端原型生成。")).toBeVisible();
  await expect(page.getByRole("heading", { name: "关键判断 / 取舍" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "项目思考" })).toBeVisible();
  await expect(page.getByRole("link", { name: "查看真实 Demo" })).toHaveAttribute(
    "href",
    "https://example.vercel.app"
  );
  await expect(page.getByRole("heading", { name: "Agent 协作原型 PRD" })).toBeVisible();
  await expect(page.getByRole("link", { name: "用户场景" })).toHaveAttribute("href", "#用户场景");
});
