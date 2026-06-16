import Link from "next/link";
import { ProjectImpression } from "@/components/analytics/project-impression";
import { TrackedLink } from "@/components/analytics/tracked-link";
import type { Project } from "@/lib/types";

export function ProjectCard({ index, project }: { index: number; project: Project }) {
  return (
    <ProjectImpression
      className="project-experience"
      projectId={project.id}
      projectSlug={project.slug}
      projectTitle={project.title}
    >
      <div className="project-experience__index">{String(index + 1).padStart(2, "0")}</div>

      <div className="project-experience__main">
        <div className="tag-row" aria-label={`${project.title} 标签`}>
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <h3>{project.title}</h3>
        <p>{project.summary}</p>

        <dl className="project-experience__facts">
          <div>
            <dt>我的角色</dt>
            <dd>{project.contribution}</dd>
          </div>
          <div>
            <dt>AI 使用方式</dt>
            <dd>{project.aiUsage}</dd>
          </div>
          <div>
            <dt>关键判断</dt>
            <dd>{project.decisions}</dd>
          </div>
          <div>
            <dt>项目思考</dt>
            <dd>{project.reflection}</dd>
          </div>
        </dl>
      </div>

      <div className="project-experience__actions">
        <Link className="button-link button-link--primary" href={`/projects/${project.slug}`}>
          阅读详情
        </Link>
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
    </ProjectImpression>
  );
}
