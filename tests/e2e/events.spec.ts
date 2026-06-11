import { expect, test } from "@playwright/test";

const blockedMetadataKeys = ["browser", "os", "language", "screenWidth", "screenHeight"];

test("campaign vanity route redirects home and sets campaign cookie", async ({ context, page }) => {
  await page.goto("/v/sample-ai-pm");

  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
  await expect(page.getByRole("heading", { name: /你好，我是/ })).toBeVisible();

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "portfolio_campaign")?.value).toBe("sample-ai-pm");
});

test("homepage sends page view and project click events without low-value browser metadata", async ({ page }) => {
  const requests: unknown[] = [];

  await page.route("**/api/events", async (route) => {
    const postData = route.request().postData();
    if (postData) {
      requests.push(JSON.parse(postData));
    }

    await route.fulfill({
      body: JSON.stringify({ ok: true }),
      contentType: "application/json",
      status: 200
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { exact: true, name: "Agent 协作原型" })).toBeVisible();

  await expect
    .poll(() => getCapturedEvents(requests).some((event) => event.eventType === "page_view"))
    .toBe(true);

  const demoPopupPromise = page.waitForEvent("popup").catch(() => null);
  await page.getByRole("link", { name: "查看 Demo" }).first().click();
  const demoPopup = await demoPopupPromise;
  await demoPopup?.close();

  await expect
    .poll(() => getCapturedEvents(requests).some((event) => event.eventType === "demo_click"))
    .toBe(true);

  await page.getByRole("link", { name: "阅读详情" }).first().click();

  await expect
    .poll(() => getCapturedEvents(requests).some((event) => event.eventType === "project_detail_view"))
    .toBe(true);

  const importantEvents = getCapturedEvents(requests).filter((event) =>
    typeof event.eventType === "string" &&
    ["page_view", "demo_click", "project_detail_view"].includes(event.eventType)
  );

  expect(importantEvents.length).toBeGreaterThanOrEqual(3);

  for (const event of importantEvents) {
    for (const key of blockedMetadataKeys) {
      expect(event.metadata ?? {}).not.toHaveProperty(key);
    }
  }
});

function getCapturedEvents(requests: unknown[]): Array<Record<string, unknown>> {
  return requests.flatMap((request) => {
    if (!isRecord(request)) {
      return [];
    }

    if (Array.isArray(request.events)) {
      return request.events.filter(isRecord);
    }

    return [request];
  });
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
