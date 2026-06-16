import Link from "next/link";
import { ProjectGrid } from "@/components/public/project-grid";
import { ResumeEvidence } from "@/components/public/resume-evidence";
import { SiteFooter } from "@/components/public/site-footer";
import { getPublicProfile, getPublishedProjects } from "@/lib/data/public";

export const dynamic = "force-dynamic";

const abilityChain = ["场景识别", "问题定义", "AI 原型", "PRD 表达", "协作复盘"];

export default async function HomePage() {
  const [profile, projects] = await Promise.all([getPublicProfile(), getPublishedProjects()]);
  const featuredProjects = projects.filter((project) => project.isFeatured).slice(0, 2);

  return (
    <main className="public-page">
      <section className="hero" aria-labelledby="home-title">
        <div className="hero__copy">
          <p className="eyebrow">{profile.title}</p>
          <h1 id="home-title">
            你好，我是 <span>{profile.displayName}</span>
          </h1>
          <p className="hero__headline">{profile.headline}</p>
          <p className="hero__intro">{profile.intro}</p>

          <div className="ability-chain" aria-label="能力链">
            {abilityChain.map((ability) => (
              <span key={ability}>{ability}</span>
            ))}
          </div>
        </div>

        <aside className="featured-preview" aria-labelledby="featured-title">
          <p className="eyebrow">Featured Work</p>
          <h2 id="featured-title">精选项目预览</h2>
          <div className="featured-preview__list">
            {featuredProjects.length > 0 ? (
              featuredProjects.map((project) => (
                <Link href={`/projects/${project.slug}`} key={project.id}>
                  <span>{project.tags.slice(0, 2).join(" / ")}</span>
                  <strong>{project.title}</strong>
                  <em>{project.summary}</em>
                </Link>
              ))
            ) : (
              <p>项目内容正在整理。</p>
            )}
          </div>
        </aside>
      </section>

      <section className="capability-section" aria-labelledby="capability-title">
        <div className="section-heading">
          <p>How I Work</p>
          <h2 id="capability-title">能力链</h2>
          <span>我更关注从需求到证据的闭环，而不是只展示一个看起来完成的页面。</span>
        </div>
        <ol className="capability-steps">
          {abilityChain.map((ability, index) => (
            <li key={ability}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{ability}</strong>
            </li>
          ))}
        </ol>
      </section>

      <ProjectGrid projects={projects} />

      <ResumeEvidence profile={profile} />

      <SiteFooter />
    </main>
  );
}
