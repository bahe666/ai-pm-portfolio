import type { Project } from "@/lib/types";
import { ProjectCard } from "./project-card";

export function ProjectGrid({ projects }: { projects: Project[] }) {
  const publishedProjects = projects.filter((project) => project.status === "published");

  return (
    <section className="project-section" aria-labelledby="projects-title">
      <div className="section-heading">
        <p>Project Experience</p>
        <h2 id="projects-title">项目经历</h2>
        <span>按项目顺序快速扫读场景、角色、AI 使用方式和关键判断；精选项目仍在上方负责第一眼吸引。</span>
      </div>

      <div className="project-experience-list">
        {publishedProjects.map((project, index) => (
          <ProjectCard index={index} key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}
