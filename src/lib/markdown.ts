import GithubSlugger from "github-slugger";
import { toString as hastToString } from "hast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export type MarkdownHeading = {
  depth: 2 | 3;
  text: string;
  id: string;
};

type HastNode = {
  type: string;
  tagName?: string;
  children?: HastNode[];
};

export function headingId(text: string) {
  const slugger = new GithubSlugger();
  return slugger.slug(text);
}

export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const slugger = new GithubSlugger();
  const headings: MarkdownHeading[] = [];
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: false });
  const tree = processor.runSync(processor.parse(markdown)) as HastNode;

  function visit(node: HastNode) {
    if (node.type === "element" && (node.tagName === "h2" || node.tagName === "h3")) {
      const text = hastToString(node as Parameters<typeof hastToString>[0]).trim();

      if (text) {
        headings.push({
          depth: node.tagName === "h2" ? 2 : 3,
          text,
          id: slugger.slug(text)
        });
      }
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
