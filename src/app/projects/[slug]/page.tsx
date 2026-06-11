import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownPrd } from "@/components/public/markdown-prd";
import { SiteFooter } from "@/components/public/site-footer";
import { getPublishedProjectBySlug } from "@/lib/data/public";

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);

  if (!project) notFound();

  return (
    <main className="project-detail" data-project-id={project.id}>
      <Link className="back-link" href="/">
        返回作品集首页
      </Link>

      <header className="project-detail__header">
        <p className="eyebrow">{project.tags.join(" / ")}</p>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
        <div className="action-row">
          <a className="button-link button-link--primary" href={project.demoUrl} target="_blank" rel="noreferrer">
            查看真实 Demo
          </a>
        </div>
      </header>

      <section className="project-detail__media" aria-label={`${project.title} 截图和 Demo`}>
        {project.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.coverImageUrl} alt={`${project.title} 原型截图`} />
        ) : (
          <div className="detail-placeholder">
            <span>Prototype Snapshot</span>
            <strong>{project.title}</strong>
            <p>{project.summary}</p>
          </div>
        )}
      </section>

      <section className="detail-grid" aria-label="项目说明">
        <article>
          <h2>我的贡献</h2>
          <p>{project.contribution}</p>
        </article>
        <article>
          <h2>AI 使用方式</h2>
          <p>{project.aiUsage}</p>
        </article>
        <article>
          <h2>关键判断 / 取舍</h2>
          <p>{project.decisions}</p>
        </article>
        <article>
          <h2>项目思考</h2>
          <p>{project.reflection}</p>
        </article>
      </section>

      <section className="prd-section" aria-labelledby="prd-title">
        <div className="section-heading">
          <p>Product Requirement Document</p>
          <h2 id="prd-title">完整 PRD</h2>
        </div>
        <MarkdownPrd markdown={project.prdMarkdown} />
      </section>

      <SiteFooter />
    </main>
  );
}
