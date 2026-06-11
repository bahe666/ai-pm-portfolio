import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { extractMarkdownHeadings } from "@/lib/markdown";

export function MarkdownPrd({ markdown }: { markdown: string }) {
  const headings = extractMarkdownHeadings(markdown);

  return (
    <div className="prd-layout">
      <nav className="prd-toc" aria-label="PRD 目录">
        <p>目录</p>
        {headings.length > 0 ? (
          headings.map((heading) => (
            <a
              className={heading.depth === 3 ? "prd-toc__link prd-toc__link--sub" : "prd-toc__link"}
              href={`#${heading.id}`}
              key={`${heading.depth}-${heading.id}`}
            >
              {heading.text}
            </a>
          ))
        ) : (
          <span>暂无二级目录</span>
        )}
      </nav>

      <article className="prd-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
