export type MarkdownHeading = {
  depth: 2 | 3;
  text: string;
  id: string;
};

export function headingId(text: string) {
  return text.trim().replace(/\s+/g, "-").toLowerCase();
}

export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  return markdown
    .split("\n")
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      depth: match[1].length as 2 | 3,
      text: match[2].trim(),
      id: headingId(match[2])
    }));
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

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxLength) return text;
  return `${words.slice(0, maxLength).join(" ").trim()}...`;
}
