import type { Project } from "@/lib/types";
import { ProjectCard } from "./project-card";

export function ProjectGrid({ projects }: { projects: Project[] }) {
  const publishedProjects = projects.filter((project) => project.status === "published");

  return (
    <section className="project-section" aria-labelledby="projects-title">
      <div className="section-heading">
        <p>Project Evidence</p>
        <h2 id="projects-title">项目证据</h2>
        <span>每个项目都保留 Demo、PRD、贡献边界和关键取舍，方便面试时直接追问。</span>
      </div>

      <div className="project-grid">
        {publishedProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}
