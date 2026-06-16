import type { Profile } from "@/lib/types";

type EvidenceBlock = {
  fallback: string;
  keywords: readonly string[];
  title: string;
  value?: string;
};

export function ResumeEvidence({ profile, projectCount }: { profile: Profile; projectCount: number }) {
  const evidenceBlocks: EvidenceBlock[] = [
    {
      fallback: "西安交通大学网安硕士，具备技术理解和产品表达的双重基础。",
      keywords: ["西安交通大学", "硕士", "研二"],
      title: "教育背景"
    },
    {
      fallback: "商汤 SenseCore 大装置事业部产品经理实习，参与 AI 工作流相关项目。",
      keywords: ["实习", "SenseCore", "工作流", "商汤"],
      title: "实习经历"
    },
    {
      fallback: "AI 工作流、Agent 协作、产品验证与风险边界。",
      keywords: ["场景", "问题", "边界", "AI", "Agent"],
      title: "AI 产品方向",
      value: "AI 工作流、Agent 协作、产品验证与风险边界。"
    },
    {
      fallback:
        projectCount > 0
          ? `${projectCount} 个项目经历，包含 Demo、PRD 与项目复盘。`
          : "项目内容正在整理，后台上传后会同步展示 Demo、PRD 与复盘。",
      keywords: ["Demo", "PRD", "原型"],
      title: "项目证据",
      value:
        projectCount > 0
          ? `${projectCount} 个项目经历，包含 Demo、PRD 与项目复盘。`
          : "项目内容正在整理，后台上传后会同步展示 Demo、PRD 与复盘。"
    },
    {
      fallback: "可以围绕场景识别、问题定义、AI 原型和协作复盘展开追问。",
      keywords: ["协作", "验证", "复盘", "边界"],
      title: "可追问重点"
    }
  ] as const;

  return (
    <section className="resume-evidence" aria-labelledby="resume-title">
      <div className="section-heading">
        <p>Candidate Snapshot</p>
        <h2 id="resume-title">履历快照</h2>
        <span>快速确认背景、实习场景和可展开追问的 AI 产品实践。</span>
      </div>
      <div className="resume-evidence__grid">
        {evidenceBlocks.map((block) => (
          <article className="resume-evidence__item" key={block.title}>
            <span>{block.title}</span>
            <strong>{block.value ?? pickResumeLine(profile.resumeSnapshot, block.keywords) ?? block.fallback}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function pickResumeLine(items: string[], keywords: readonly string[]) {
  return items.find((item) => keywords.some((keyword) => item.includes(keyword))) ?? null;
}
