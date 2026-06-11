import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";

export type MarkdownHeading = {
  depth: 2 | 3;
  text: string;
  id: string;
};

type MarkdownNode = {
  type: string;
  depth?: number;
  children?: MarkdownNode[];
};

export function headingId(text: string) {
  const slugger = new GithubSlugger();
  return slugger.slug(text);
}

export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const slugger = new GithubSlugger();
  const headings: MarkdownHeading[] = [];
  const tree = unified().use(remarkParse).parse(markdown) as MarkdownNode;

  function visit(node: MarkdownNode) {
    if (node.type === "heading" && (node.depth === 2 || node.depth === 3)) {
      const text = toString(node).trim();
      headings.push({
        depth: node.depth,
        text,
        id: slugger.slug(text)
      });
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  }

  visit(tree);

  return headings;
}

export function summarizeMarkdown(markdown: string, maxLength = 160) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, "")
    .split("\n")
    .filter((line) => !/^#{1,6}\s+/.test(line.trim()))
    .join("\n")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const characters = Array.from(text);
  if (characters.length <= Math.max(maxLength, 16)) return text;
  return `${characters.slice(0, maxLength).join("").trim()}...`;
}
