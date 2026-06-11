import Link from "next/link";
import { summarizeMarkdown } from "@/lib/markdown";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  const prdSummary = summarizeMarkdown(project.prdMarkdown, 120);

  return (
    <article className="project-card" data-project-id={project.id}>
      <div className="project-card__cover" aria-label={`${project.title} 截图预览`}>
        {project.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.coverImageUrl} alt={`${project.title} 原型截图`} />
        ) : (
          <div className="project-card__placeholder" aria-hidden="true">
            <span>{project.tags[0] ?? "Prototype"}</span>
            <strong>{project.title}</strong>
          </div>
        )}
      </div>

      <div className="project-card__body">
        <div className="tag-row" aria-label={`${project.title} 标签`}>
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <h3>{project.title}</h3>
        <p className="project-card__summary">{project.summary}</p>

        <dl className="project-evidence">
          <div>
            <dt>我的贡献</dt>
            <dd>{project.contribution}</dd>
          </div>
          <div>
            <dt>AI 使用方式</dt>
            <dd>{project.aiUsage}</dd>
          </div>
          <div>
            <dt>关键判断 / 取舍</dt>
            <dd>{project.decisions}</dd>
          </div>
          <div>
            <dt>PRD 摘要</dt>
            <dd>{prdSummary}</dd>
          </div>
        </dl>

        <div className="action-row">
          <Link className="button-link button-link--primary" href={`/projects/${project.slug}`}>
            阅读详情
          </Link>
          <a className="button-link" href={project.demoUrl} target="_blank" rel="noreferrer">
            查看 Demo
          </a>
        </div>
      </div>
    </article>
  );
}
