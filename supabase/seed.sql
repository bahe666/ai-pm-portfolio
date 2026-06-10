insert into public.profiles (id, display_name, title, headline, intro, contact, resume_snapshot)
values (
  '00000000-0000-4000-8000-000000000001',
  '你的姓名',
  'AI 产品经理实习生候选人',
  '如果你只有 3 分钟认识我，可以先看看这些从“能不能做个 Demo”开始的 AI 产品原型。',
  '这里整理了我上一段实习中的部分原型 Demo、PRD 和项目思考：它们记录了我如何把抽象需求变成可讨论的页面，也记录了我对场景、边界和协作方式的判断。',
  '{"email":"you@example.com"}'::jsonb,
  '["上一段实习参与团队工作流 AI 化转型，主动使用 AI 搭建产品 Demo。","核心产出包括原型 Demo、PRD、项目复盘，以及产品-研发 Agent 协作探索。","关注场景识别、问题定义、AI 边界判断和可验证产出。"]'::jsonb
)
on conflict (id) do update set
  display_name = excluded.display_name,
  title = excluded.title,
  headline = excluded.headline,
  intro = excluded.intro,
  contact = excluded.contact,
  resume_snapshot = excluded.resume_snapshot,
  updated_at = now();

insert into public.projects (
  id, title, slug, summary, tags, demo_url, contribution, ai_usage, decisions, reflection, prd_markdown, status, is_featured, sort_order
)
values
(
  '11111111-1111-4111-8111-111111111111',
  'Agent 协作原型',
  'agent-collaboration-prototype',
  '把产品-研发协作中的重复沟通节点转成可验证的 Agent 流程原型。',
  array['Agent','AI Workflow','PRD'],
  'https://example.vercel.app',
  '拆解协作流程，搭建原型页面，沉淀 PRD 结构。',
  '使用 AI 辅助流程拆解、交互草稿和前端原型生成。',
  '保留人工确认节点，不把需求判断完全交给 Agent。',
  '这个项目让我更清楚地区分 AI 可以加速的执行环节和 PM 必须负责的判断环节。',
  '# Agent 协作原型 PRD

## 用户场景

团队需要更快讨论抽象需求。

## 关键取舍

保留人工确认节点。',
  'published',
  true,
  1
),
(
  '22222222-2222-4222-8222-222222222222',
  'ToB 流程 Demo',
  'tob-workflow-demo',
  '把业务流程中的关键状态整理成可演示的 ToB 原型。',
  array['ToB','Workflow','Prototype'],
  'https://example.github.io/workflow-demo',
  '梳理流程状态、定义页面信息层级、撰写 PRD。',
  '使用 AI 快速生成交互备选稿，再人工收敛流程。',
  '优先展示高频状态，隐藏低频异常路径。',
  '流程型 Demo 的价值不是完整，而是让团队先对主路径达成共识。',
  '# ToB 流程 Demo PRD

## 用户场景

业务人员需要快速理解流程状态。

## 验收标准

主路径可完整演示。',
  'published',
  false,
  2
)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  tags = excluded.tags,
  demo_url = excluded.demo_url,
  contribution = excluded.contribution,
  ai_usage = excluded.ai_usage,
  decisions = excluded.decisions,
  reflection = excluded.reflection,
  prd_markdown = excluded.prd_markdown,
  status = excluded.status,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.campaigns (id, company, role, jd_summary, tags, channel, notes, slug)
values (
  '33333333-3333-4333-8333-333333333333',
  '示例公司',
  'AI 产品经理实习生',
  '关注 Agent、AI Workflow 和产品原型能力。',
  array['Agent','AI PM'],
  'manual',
  '本地种子数据。',
  'sample-ai-pm'
)
on conflict (id) do update set
  company = excluded.company,
  role = excluded.role,
  jd_summary = excluded.jd_summary,
  tags = excluded.tags,
  channel = excluded.channel,
  notes = excluded.notes,
  slug = excluded.slug,
  updated_at = now();
