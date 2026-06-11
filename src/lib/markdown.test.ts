import { describe, expect, it } from "vitest";
import { extractMarkdownHeadings, headingId, summarizeMarkdown } from "./markdown";

describe("extractMarkdownHeadings", () => {
  it("returns h2 and h3 headings with stable ids", () => {
    expect(extractMarkdownHeadings("# Title\n\n## 用户场景\n\n### 关键路径")).toEqual([
      { depth: 2, text: "用户场景", id: "用户场景" },
      { depth: 3, text: "关键路径", id: "关键路径" }
    ]);
  });

  it("uses GitHub-style ids for duplicate headings in document order", () => {
    expect(extractMarkdownHeadings("## 用户场景\n\n## 用户场景")).toEqual([
      { depth: 2, text: "用户场景", id: "用户场景" },
      { depth: 2, text: "用户场景", id: "用户场景-1" }
    ]);
  });

  it("strips simple inline markdown from heading text before slugging", () => {
    expect(extractMarkdownHeadings("## **背景**")).toEqual([{ depth: 2, text: "背景", id: "背景" }]);
  });

  it("ignores headings inside fenced code blocks", () => {
    expect(extractMarkdownHeadings("```md\n## 代码里的标题\n```\n\n## 正文标题")).toEqual([
      { depth: 2, text: "正文标题", id: "正文标题" }
    ]);
  });
});

describe("summarizeMarkdown", () => {
  it("strips headings and returns a concise summary", () => {
    expect(summarizeMarkdown("# Title\n\n这是一段 PRD 内容。\n\n## 背景", 8)).toBe("这是一段 PRD 内容。");
  });

  it("truncates long Chinese summaries by character length", () => {
    const summary = summarizeMarkdown("这是一个很长很长很长的中文段落，用来测试摘要截断。", 10);

    expect(summary).toMatch(/\.\.\.$/);
    expect(Array.from(summary).length).toBeLessThanOrEqual(13);
  });
});

describe("headingId", () => {
  it("uses the same GitHub-style slugging as rendered headings", () => {
    expect(headingId("**背景**")).toBe("背景");
  });
});
