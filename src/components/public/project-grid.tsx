import type { Project } from "@/lib/types";
import { ProjectCard } from "./project-card";

export function ProjectGrid({ projects }: { projects: Project[] }) {
  const publishedProjects = projects.filter((project) => project.status === "published");

  return (
    <section className="project-section" aria-labelledby="projects-title">
      <div className="section-heading">
        <p>Project Experience</p>
        <h2 id="projects-title">项目经历</h2>
        <span>每个项目都包含原型、PRD 与复盘，重点展示我如何定义问题、判断 AI 边界并推动验证。</span>
      </div>

      <div className="project-experience-list">
        {publishedProjects.map((project, index) => (
          <ProjectCard index={index} key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}
