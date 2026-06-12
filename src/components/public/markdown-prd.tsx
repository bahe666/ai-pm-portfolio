import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { PrdReadTracker } from "@/components/analytics/prd-read-tracker";
import { extractMarkdownHeadings } from "@/lib/markdown";

type MarkdownPrdProps = {
  markdown: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
};

export function MarkdownPrd({ markdown, projectId, projectSlug, projectTitle }: MarkdownPrdProps) {
  const headings = extractMarkdownHeadings(markdown);

  return (
    <div className="prd-layout">
      <PrdReadTracker headings={headings} projectId={projectId} projectSlug={projectSlug} projectTitle={projectTitle} />
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
