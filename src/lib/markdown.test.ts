import { describe, expect, it } from "vitest";
import { extractMarkdownHeadings, summarizeMarkdown } from "./markdown";

describe("extractMarkdownHeadings", () => {
  it("returns h2 and h3 headings with stable ids", () => {
    expect(extractMarkdownHeadings("# Title\n\n## 用户场景\n\n### 关键路径")).toEqual([
      { depth: 2, text: "用户场景", id: "用户场景" },
      { depth: 3, text: "关键路径", id: "关键路径" }
    ]);
  });
});

describe("summarizeMarkdown", () => {
  it("strips headings and returns a concise summary", () => {
    expect(summarizeMarkdown("# Title\n\n这是一段 PRD 内容。\n\n## 背景", 8)).toBe("这是一段 PRD 内容。");
  });
});
