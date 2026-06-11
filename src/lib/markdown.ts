import GithubSlugger from "github-slugger";

export type MarkdownHeading = {
  depth: 2 | 3;
  text: string;
  id: string;
};

function stripInlineMarkdown(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/[*_`~]/g, "")
    .trim();
}

export function headingId(text: string) {
  const slugger = new GithubSlugger();
  return slugger.slug(stripInlineMarkdown(text));
}

export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const slugger = new GithubSlugger();
  const headings: MarkdownHeading[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const text = stripInlineMarkdown(match[2]);
    headings.push({
      depth: match[1].length as 2 | 3,
      text,
      id: slugger.slug(text)
    });
  }

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
