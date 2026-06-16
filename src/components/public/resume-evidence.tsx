import type { Profile } from "@/lib/types";

const evidenceBlocks = [
  {
    fallback: "西安交通大学网安硕士，具备技术理解和产品表达的双重基础。",
    keywords: ["西安交通大学", "硕士", "研二"],
    title: "教育背景"
  },
  {
    fallback: "参与 AI 工作流转型，把真实业务需求转成可讨论材料。",
    keywords: ["实习", "SenseCore", "工作流"],
    title: "实习经历"
  },
  {
    fallback: "关注真实场景、关键问题和 AI 能力边界。",
    keywords: ["场景", "问题", "边界", "AI"],
    title: "AI 产品能力"
  },
  {
    fallback: "沉淀可预览 Demo、PRD 和项目复盘。",
    keywords: ["Demo", "PRD", "原型"],
    title: "原型与 PRD 证据"
  },
  {
    fallback: "探索产品、研发与 Agent 协作的新方式。",
    keywords: ["协作", "Agent", "研发"],
    title: "协作探索"
  }
] as const;

export function ResumeEvidence({ profile }: { profile: Profile }) {
  return (
    <section className="resume-evidence" aria-labelledby="resume-title">
      <div className="section-heading">
        <p>Resume Notes</p>
        <h2 id="resume-title">轻量经历摘要</h2>
      </div>
      <div className="resume-evidence__grid">
        {evidenceBlocks.map((block) => (
          <article className="resume-evidence__item" key={block.title}>
            <span>{block.title}</span>
            <strong>{pickResumeLine(profile.resumeSnapshot, block.keywords) ?? block.fallback}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function pickResumeLine(items: string[], keywords: readonly string[]) {
  return items.find((item) => keywords.some((keyword) => item.includes(keyword))) ?? null;
}
