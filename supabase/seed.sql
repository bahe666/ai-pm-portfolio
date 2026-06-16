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
