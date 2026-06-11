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

  it("preserves underscores in heading text and ids", () => {
    expect(extractMarkdownHeadings("## user_id")).toEqual([{ depth: 2, text: "user_id", id: "user_id" }]);
  });

  it("removes ATX closing hashes from heading text", () => {
    expect(extractMarkdownHeadings("## Title ##")).toEqual([{ depth: 2, text: "Title", id: "title" }]);
  });

  it("recognizes ATX headings with up to three leading spaces", () => {
    expect(extractMarkdownHeadings("  ## Leading Space")).toEqual([
      { depth: 2, text: "Leading Space", id: "leading-space" }
    ]);
  });

  it("uses visible text from raw HTML inline headings", () => {
    expect(extractMarkdownHeadings("## <em>raw</em>")).toEqual([{ depth: 2, text: "raw", id: "raw" }]);
  });

  it("skips headings without visible text", () => {
    expect(extractMarkdownHeadings("## ![alt text](x.png)\n\n## Visible")).toEqual([
      { depth: 2, text: "Visible", id: "visible" }
    ]);
  });

  it("uses GFM rendered text for strikethrough headings", () => {
    expect(extractMarkdownHeadings("## ~~strike~~")).toEqual([{ depth: 2, text: "strike", id: "strike" }]);
  });

  it("ignores headings inside backtick fenced code blocks", () => {
    expect(extractMarkdownHeadings("```md\n## fake\n```\n\n## 正文标题")).toEqual([
      { depth: 2, text: "正文标题", id: "正文标题" }
    ]);
  });

  it("ignores headings inside tilde fenced code blocks", () => {
    expect(extractMarkdownHeadings("~~~md\n## fake\n~~~\n\n## 正文标题")).toEqual([
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
    expect(headingId("user_id")).toBe("user_id");
  });
});
