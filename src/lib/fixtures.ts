import type { Campaign, Profile, Project } from "./types";

export const fixtureProfile: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "你的姓名",
  title: "AI 产品经理实习生候选人",
  headline: "如果你只有 3 分钟认识我，可以先看看这些从“能不能做个 Demo”开始的 AI 产品原型。",
  intro:
    "这里整理了我上一段实习中的部分原型 Demo、PRD 和项目思考：它们记录了我如何把抽象需求变成可讨论的页面，也记录了我对场景、边界和协作方式的判断。",
  contact: { email: "you@example.com" },
  resumeSnapshot: [
    "上一段实习参与团队工作流 AI 化转型，主动使用 AI 搭建产品 Demo。",
    "核心产出包括原型 Demo、PRD、项目复盘，以及产品-研发 Agent 协作探索。",
    "关注场景识别、问题定义、AI 边界判断和可验证产出。"
  ],
  updatedAt: new Date("2026-06-10T00:00:00.000Z").toISOString()
};

export const fixtureProjects: Project[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Agent 协作原型",
    slug: "agent-collaboration-prototype",
    summary: "把产品-研发协作中的重复沟通节点转成可验证的 Agent 流程原型。",
    tags: ["Agent", "AI Workflow", "PRD"],
    demoUrl: "https://example.vercel.app",
    coverImageUrl: null,
    contribution: "拆解协作流程，搭建原型页面，沉淀 PRD 结构。",
    aiUsage: "使用 AI 辅助流程拆解、交互草稿和前端原型生成。",
    decisions: "保留人工确认节点，不把需求判断完全交给 Agent。",
    reflection: "这个项目让我更清楚地区分 AI 可以加速的执行环节和 PM 必须负责的判断环节。",
    prdMarkdown: "# Agent 协作原型 PRD\n\n## 用户场景\n\n团队需要更快讨论抽象需求。\n\n## 关键取舍\n\n保留人工确认节点。",
    status: "published",
    isFeatured: true,
    sortOrder: 1,
    analyticsEnabled: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-06-10T00:00:00.000Z").toISOString()
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "ToB 流程 Demo",
    slug: "tob-workflow-demo",
    summary: "把业务流程中的关键状态整理成可演示的 ToB 原型。",
    tags: ["ToB", "Workflow", "Prototype"],
    demoUrl: "https://example.github.io/workflow-demo",
    coverImageUrl: null,
    contribution: "梳理流程状态、定义页面信息层级、撰写 PRD。",
    aiUsage: "使用 AI 快速生成交互备选稿，再人工收敛流程。",
    decisions: "优先展示高频状态，隐藏低频异常路径。",
    reflection: "流程型 Demo 的价值不是完整，而是让团队先对主路径达成共识。",
    prdMarkdown: "# ToB 流程 Demo PRD\n\n## 用户场景\n\n业务人员需要快速理解流程状态。\n\n## 验收标准\n\n主路径可完整演示。",
    status: "published",
    isFeatured: false,
    sortOrder: 2,
    analyticsEnabled: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-06-10T00:00:00.000Z").toISOString()
  }
];

export const fixtureCampaigns: Campaign[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    company: "示例公司",
    role: "AI 产品经理实习生",
    jdUrl: null,
    jdSummary: "关注 Agent、AI Workflow 和产品原型能力。",
    tags: ["Agent", "AI PM"],
    channel: "manual",
    notes: "本地种子数据。",
    slug: "sample-ai-pm",
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-06-10T00:00:00.000Z").toISOString()
  }
];
