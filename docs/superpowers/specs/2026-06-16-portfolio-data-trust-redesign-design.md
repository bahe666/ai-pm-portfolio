# AI PM Portfolio Data Trust Redesign Design

## Background

The portfolio already has a public page, campaign-specific tracking links, admin login, project management, and analytics. The current problem is not only visual polish. The site must become a reliable long-term portfolio product:

- Public content must be editable from the admin.
- Candidate-facing links must keep their campaign identity in the URL.
- Analytics must show real behavior only, not mock data.
- Project content must scale from the current 5-6 projects to more projects later.
- The admin must help evaluate what interviewers care about by company, role, and project interest.

This design follows the approved direction: data trust first, public page improvements second.

## Decisions Already Approved

- Remove the two production mock projects after exporting a local backup.
- Keep campaign URLs visible as `/v/:campaignSlug` instead of redirecting to `/`.
- Use one shared content source for `/` and `/v/:campaignSlug`; backend edits update both.
- Redesign the public "项目证据" section as "项目经历".
- Use a timeline/index layout for project experiences, optimized for scanability rather than extra visual impact.
- Keep the existing earlier featured-project area responsible for first-glance attraction.
- Build analytics around real behavioral signals: impressions, detail opens, PRD reading, demo clicks, dwell time, and campaign slug.
- Do not store raw IP. Use campaign slug, company/role tags, referrer, region, path, event behavior, and dwell time.
- Keep the footer privacy copy: "我会用匿名访问数据观察这个作品集哪里更有用。如果你也好奇这些数据说明了什么，欢迎把它变成一道面试题。"

## Goals

1. Make admin-edited content reliably appear on the public page and campaign pages.
2. Make project management sustainable: create, edit, delete, reorder, publish/unpublish.
3. Make analytics trustworthy by removing mock values and showing empty states when there is no data.
4. Make session paths inspectable through a paginated list and dedicated detail page.
5. Make the public project experience easier for interviewers to scan as project count grows.
6. Keep hosting feasible on Vercel Hobby and Supabase Free for normal interview traffic.

## Non-Goals

- No AI-generated analytics diagnosis or automated recommendations.
- No resume PDF generation or download.
- No full recruiting CRM with interview pipeline, offer stages, notes, or reminders.
- No raw IP storage or company inference based on IP.
- No heavy media hosting in Supabase Storage unless explicitly needed later.

## Public Page Design

The public page keeps a clear hierarchy:

1. Personal intro and positioning.
2. Featured projects for the first strong impression.
3. Lightweight experience summary.
4. Project experiences as a durable, scan-friendly index.
5. Footer privacy note.

### Campaign URL Behavior

`/v/:campaignSlug` should render the same public portfolio content while preserving the visible URL. It should also associate the session with the campaign slug for analytics.

The campaign page is not a copied snapshot. It reads the same profile and project data as `/`, so future admin edits update both normal and campaign URLs.

### Data Freshness

The public page must avoid stale static content after admin edits. The implementation can use dynamic rendering, explicit revalidation, or cache tags, but the acceptance criterion is simple: after editing content in the admin, refreshing `/` and `/v/:campaignSlug` shows the new content.

### Lightweight Experience Summary

Replace the current text/table style with compact summary blocks. The first implementation should use these blocks:

- 教育背景: school, degree, current stage.
- 实习经历: company/team context and AI workflow transformation.
- AI 产品能力: scene recognition, problem definition, AI boundary judgment.
- 原型与 PRD 证据: demo building, PRD writing, product validation.
- 协作探索: product-engineering-Agent collaboration.

Each block should have a strong label, 1-2 evidence keywords, and one concise sentence.

### Project Experiences

Rename "项目证据" to "项目经历".

Use a timeline/index layout instead of many large cards. Each project row should expose enough information for fast scanning:

- Project title.
- Scenario/problem.
- My role.
- AI usage method.
- Key product judgment.
- Tags.
- Entry points: demo preview, PRD preview, project thinking, detail page.

The layout should support 5-10 projects without becoming visually noisy. Featured projects remain separate and may use larger visual treatment.

## Admin Project Management

Project management should support full CRUD:

- Create project.
- Edit project.
- Delete project with confirmation.
- Reorder projects.
- Toggle public visibility.
- Toggle featured status.

Editable project fields:

- Title.
- Summary.
- Scenario/problem.
- Project type and tags.
- Date or time range.
- My role.
- AI usage.
- Key judgment.
- Project thinking.
- Demo URL.
- PRD Markdown content or PRD URL.
- Cover or preview image URL.
- Featured flag.
- Public visibility flag.
- Sort order.

### Mock Project Cleanup

Before deleting existing mock projects, export them to a local backup file under a backup directory. Then remove them from the production database so they no longer appear on the public page or analytics tables.

Historical analytics events should not be hard-deleted just because a project is removed. If a past event references a deleted project, analytics should display "已删除项目" or "未知项目" rather than failing.

## Analytics Dashboard

Analytics must use real collected data only. No mock sessions, mock project metrics, or fake campaign performance should appear.

When data is missing, show an explicit empty state:

- "暂无项目详情访问"
- "暂无 PRD 阅读事件"
- "暂无投递链接访问"
- "暂无可分析的会话"

### Dashboard Modules

Keep the following modules, but compute all values from real tables:

- Overview: visitors, sessions, events, campaign sessions, project detail visits, demo clicks.
- Project interest: impressions, detail opens, PRD reads, demo clicks, average dwell time.
- Campaign comparison: sessions, deep visits, interested projects by campaign/company/role slug.
- JD tag preference: which project tags attract visitors from campaign links with specific role/JD tags.
- Reading funnel: portfolio open, project section view, project detail open, PRD read, demo click.
- PRD section interest: section-level view/dwell metrics when available; otherwise empty state.

### Interest Metrics

Project interest should not rely on a single click count. Use a combined evidence set:

- Project impressions.
- Project detail opens.
- PRD opens or reads.
- Demo clicks.
- Project section dwell time.
- Campaign/company/role slug.

The UI may sort by a calculated interest score, but it must still expose the underlying raw counts so the metric is explainable.

## Sessions

The recent session area becomes two-level.

### Session List

The dashboard shows a paginated session list. Each row should include:

- Visit time.
- Campaign slug and label if present.
- Region, limited to country/province/city where available.
- Entry path.
- Total event count.
- Viewed projects.
- Key actions such as PRD read or demo click.
- Session depth summary.

The list should support pagination so it does not become noisy as data grows.

### Session Detail Page

Clicking a session opens a dedicated detail page. It should show:

- Session metadata: campaign, region, referrer, start/end time, duration.
- Event timeline in chronological order.
- Project-level behavior: impressions, opens, PRD reads, demo clicks, dwell time.
- Page path sequence.
- PRD section behavior when captured.

No AI diagnosis or generated recommendations should appear.

## Event Collection

Capture behavior useful for portfolio optimization:

- `page_view`
- `section_view`
- `project_impression`
- `project_detail_open`
- `prd_open`
- `prd_read`
- `demo_click`
- `external_link_click`
- `section_dwell`
- `project_dwell`

Each event should be associated with:

- Session.
- Visitor.
- Campaign slug/campaign id when available.
- Project id when relevant.
- Page path.
- Timestamp.
- Basic metadata needed to render analytics.

Avoid noisy or low-value device fields such as browser, OS, language, and screen size unless already required by existing code. Do not store raw IP.

### Event Volume Protection

Keep event volume suitable for Supabase Free:

- Do not use high-frequency heartbeat events.
- Deduplicate repeated impressions when possible.
- Send dwell events at meaningful boundaries, such as section leave or page unload.
- Keep payloads small.

## Data Backup

The admin should support exporting portfolio data for backup:

- Profile/public page content.
- Projects and PRD Markdown.
- Campaigns.
- Analytics summary data.

Export should produce a file that can be stored locally outside Supabase.

## Hosting Limits

### Vercel Hobby

Vercel Hobby should cover normal interview-portfolio traffic. Current official limits include 100 GB Fast Data Transfer, about 1,000,000 Edge Requests, function resource limits, and 1 hour of runtime logs.

Risks that could exceed Hobby usage:

- Large images or videos.
- Sudden broad public sharing.
- Very frequent analytics event calls.
- Excessive deployments.

Do not rely on Vercel runtime logs for analytics because Hobby runtime logs are short-lived. Analytics should live in Supabase.

References:

- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits/fair-use-guidelines
- https://vercel.com/docs/limits

### Supabase Free

Supabase Free should also cover this portfolio if event volume remains controlled. Current official limits include 500 MB database size, 1 GB file storage, 5 GB egress, 50,000 monthly active users, and 500,000 Edge Function invocations. Free projects may be paused after low activity, but pausing does not mean the portfolio data should be deleted.

Risks that could exceed Free usage:

- High-frequency event logging.
- Storing large PRD files or media in Supabase Storage.
- Very large raw event history without archiving.
- Heavy admin queries over unindexed analytics tables.

Mitigations:

- Event throttling and deduplication.
- Keep large assets on GitHub/Vercel/external URLs when reasonable.
- Add basic data volume visibility in the admin.
- Support export backups.
- Consider later archival or cleanup for old raw events if volume grows.

References:

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/deployment/going-into-prod

## Security And Access

- Admin remains whitelist-only.
- Password login can coexist with email OTP/magic-code login.
- Public visitors cannot reach admin pages without authentication.
- Service role keys must only be used server-side.
- RLS and admin API access should be reviewed when changing tables or routes.

## Acceptance Criteria

### Public Page

- `/` renders current admin-managed content.
- `/v/:campaignSlug` preserves the campaign URL and renders the same current content.
- Updating public content in the admin is visible on `/` and `/v/:campaignSlug` after refresh.
- "项目证据" is renamed to "项目经历".
- Project experiences use the approved scan-friendly timeline/index layout.
- Lightweight experience summary uses compact evidence blocks instead of plain text/table presentation.

### Project Admin

- Existing mock projects are backed up and removed from production data.
- Admin can create, edit, delete, reorder, publish/unpublish, and feature/unfeature projects.
- Deleting a project requires confirmation.
- Deleted-project historical events do not break analytics.

### Analytics

- Dashboard shows no mock data.
- Empty modules show explicit empty-state copy.
- Project interest uses real events and exposes raw counts.
- Campaign comparison works from real campaign/session/event data.
- JD tag preference is a real aggregation, not an AI-generated suggestion.
- Recent sessions are paginated.
- Session rows link to a session detail page.
- Session detail shows metadata, path, timeline, project behavior, and PRD behavior.

### Tracking

- Campaign slug is associated with sessions from `/v/:campaignSlug`.
- Events are recorded for page views, project impressions, details, PRD, demo clicks, and dwell time.
- Raw IP is not stored.
- Footer privacy note is present and unobtrusive.

### Deployment

- Production build succeeds.
- Key routes smoke test successfully:
  - `/`
  - `/v/sample-ai-pm`
  - `/login`
  - `/admin/projects`
  - `/admin/analytics`
  - session detail route
- Analytics behavior is tested with at least one real event flow.
