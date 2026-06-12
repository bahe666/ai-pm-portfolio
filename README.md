# AI PM Portfolio

一个面向 AI 产品经理实习面试的作品集网站，包含公开作品集、白名单后台、项目/PRD 管理、投递追踪链接和真实访问行为监控。

## Tech Stack

Next.js App Router · TypeScript · Supabase Postgres/Auth/Storage · `@vercel/functions` · Vitest · Playwright

## Local Development

```bash
cp .env.example .env.local        # 填入 Supabase URL、anon key、service role key 和 ADMIN_EMAILS
npm install
npm run dev
```

无 Supabase 配置时公开页会自动 fallback 到 `src/lib/fixtures.ts` 的种子数据，便于本地预览。

## Required Environment Variables

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`（逗号分隔的白名单邮箱）

## Main Routes

- `/` 公开作品集首页
- `/projects/[slug]` 项目详情与 Markdown PRD
- `/v/[campaignSlug]` 投递追踪链接入口
- `/login` 后台登录（Supabase magic link）
- `/admin` 后台首页（重定向到分析）
- `/admin/analytics` 数据驾驶舱
- `/admin/projects` 项目管理
- `/admin/campaigns` 投递链接管理
- `/admin/profile` 经历摘要编辑
- `/admin/backups` JSON 备份导出

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Database

Schema 与 RLS 在 `supabase/migrations/202606100001_initial_schema.sql`，本地种子数据在 `supabase/seed.sql`。可通过 Supabase CLI（`supabase db reset`）或 Supabase SQL Editor 应用。

## Deployment

部署到 Vercel，并在项目环境变量里填入与本地一致的 5 个变量。Supabase 是行为数据的唯一权威来源，不依赖 Vercel Analytics。

## Documentation

- 设计稿：`docs/superpowers/specs/2026-06-10-ai-pm-portfolio-design.md`
- 实施计划：`docs/superpowers/plans/2026-06-10-ai-pm-portfolio-mvp.md`
