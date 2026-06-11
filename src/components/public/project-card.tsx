import { ProjectImpression } from "@/components/analytics/project-impression";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { summarizeMarkdown } from "@/lib/markdown";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  const prdSummary = summarizeMarkdown(project.prdMarkdown, 120);

  return (
    <ProjectImpression
      className="project-card"
      projectId={project.id}
      projectSlug={project.slug}
      projectTitle={project.title}
    >
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
          <TrackedLink
            className="button-link button-link--primary"
            eventType="project_detail_view"
            href={`/projects/${project.slug}`}
            metadata={{ projectSlug: project.slug, projectTitle: project.title }}
            projectId={project.id}
          >
            阅读详情
          </TrackedLink>
          <TrackedLink
            className="button-link"
            eventType="demo_click"
            href={project.demoUrl}
            metadata={{ projectSlug: project.slug, projectTitle: project.title }}
            projectId={project.id}
            rel="noreferrer"
            target="_blank"
            targetUrl={project.demoUrl}
          >
            查看 Demo
          </TrackedLink>
        </div>
      </div>
    </ProjectImpression>
  );
}
