# AI PM 作品集 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可部署到 Vercel 的 Next.js + Supabase 作品集网站，包含公开面试官页、白名单登录后台、项目/PRD 管理、投递追踪链接、真实行为监控和 JSON 备份导出。

**Architecture:** Next.js App Router 负责公开页、后台页面和 Route Handlers；Supabase Postgres/Storage/Auth 负责数据、文件和登录。浏览器端不直接执行管理数据写入，后台操作统一经过服务端校验登录态和 `ADMIN_EMAILS` 白名单后，再用 service role 执行受控操作。

**Tech Stack:** Next.js App Router, TypeScript, React, CSS Modules/global CSS, Supabase Auth/Postgres/Storage, `@supabase/ssr`, `@supabase/supabase-js`, `react-markdown`, `remark-gfm`, `rehype-slug`, `zod`, Vitest, Testing Library, Playwright, Vercel.

---

## Scope Check

本计划覆盖设计文档中第一版目标：公开页、后台登录、项目管理、PRD 渲染、投递追踪、行为采集、数据驾驶舱和备份导出。以下内容不进入本计划：自动抓取截图、截图 zip 导出、AI 诊断建议、自动个性化投递页、简历 PDF 生成。

## Implementation References

- Next.js App Router 官方文档：`https://nextjs.org/docs/app`
- Next.js 安装官方文档：`https://nextjs.org/docs/app/getting-started/installation`
- Supabase SSR client 官方文档：`https://supabase.com/docs/guides/auth/server-side/creating-a-client`
- Supabase + Next.js 官方 quickstart：`https://supabase.com/docs/guides/getting-started/quickstarts/nextjs`
- Vercel Functions 官方文档：`https://vercel.com/docs/functions`
- Vercel `@vercel/functions` API 官方文档：`https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package`
- Vercel geo/IP headers 说明：`https://vercel.com/kb/guide/geo-ip-headers-geolocation-vercel-functions`

## File Structure

Create these top-level files:

- `package.json`：scripts、dependencies、devDependencies。
- `tsconfig.json`：TypeScript strict config and `@/*` alias.
- `next.config.ts`：Next.js config.
- `vitest.config.ts`：unit/component test config.
- `playwright.config.ts`：end-to-end test config.
- `.env.example`：required environment variables.
- `supabase/migrations/202606100001_initial_schema.sql`：database schema, indexes, RLS.
- `supabase/seed.sql`：local seed data for profile/projects/campaign.

Create app files:

- `src/app/layout.tsx`：root layout and metadata.
- `src/app/globals.css`：editorial design system, public/admin layout styles.
- `src/app/page.tsx`：public interviewer homepage.
- `src/app/projects/[slug]/page.tsx`：project detail and Markdown PRD page.
- `src/app/v/[campaignSlug]/route.ts`：campaign attribution route that sets campaign cookie and redirects to `/`.
- `src/app/login/page.tsx`：admin login page.
- `src/app/auth/callback/route.ts`：Supabase auth callback.
- `src/app/admin/layout.tsx`：admin auth guard and shell.
- `src/app/admin/page.tsx`：redirect to analytics.
- `src/app/admin/analytics/page.tsx`：data dashboard.
- `src/app/admin/projects/page.tsx`：project list/editor.
- `src/app/admin/campaigns/page.tsx`：campaign manager.
- `src/app/admin/profile/page.tsx`：profile/resume snapshot editor.
- `src/app/admin/backups/page.tsx`：backup export UI.
- `src/app/api/events/route.ts`：event ingestion API.
- `src/app/api/admin/projects/route.ts`：project create/list API.
- `src/app/api/admin/projects/[id]/route.ts`：project update/delete API.
- `src/app/api/admin/campaigns/route.ts`：campaign create/list API.
- `src/app/api/admin/profile/route.ts`：profile update API.
- `src/app/api/admin/backups/route.ts`：JSON backup export API.

Create shared modules:

- `src/lib/types.ts`：domain types and event enum.
- `src/lib/env.ts`：environment validation.
- `src/lib/supabase/server.ts`：cookie-aware SSR client.
- `src/lib/supabase/admin.ts`：server-only service role client.
- `src/lib/auth/admin.ts`：white-list admin guard.
- `src/lib/data/public.ts`：public read models.
- `src/lib/data/admin.ts`：admin CRUD helpers.
- `src/lib/data/analytics.ts`：analytics aggregation helpers.
- `src/lib/markdown.ts`：Markdown parsing/render helpers.
- `src/lib/analytics/client.ts`：client-side event batching.
- `src/lib/analytics/session.ts`：visitor/session id helpers.
- `src/lib/analytics/events.ts`：event payload validation.
- `src/components/analytics/page-view-tracker.tsx`：client page view tracking.
- `src/components/analytics/project-impression.tsx`：client project impression tracking.
- `src/components/analytics/tracked-link.tsx`：client click tracking for Demo and external links.
- `src/components/public/*`：public page components.
- `src/components/admin/*`：admin shell, forms, dashboard components.
- `src/components/common/*`：shared buttons, inputs, empty states.

Create tests:

- `src/lib/analytics/events.test.ts`
- `src/lib/analytics/session.test.ts`
- `src/lib/markdown.test.ts`
- `src/lib/data/analytics.test.ts`
- `src/lib/auth/admin.test.ts`
- `src/components/public/project-card.test.tsx`
- `tests/e2e/public.spec.ts`
- `tests/e2e/admin-auth.spec.ts`
- `tests/e2e/events.spec.ts`

---

### Task 1: Project Scaffold And Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Create the package manifest**

Create `package.json`:

```json
{
  "name": "ai-pm-portfolio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@supabase/ssr": "latest",
    "@supabase/supabase-js": "latest",
    "@vercel/functions": "latest",
    "lucide-react": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-markdown": "latest",
    "rehype-slug": "latest",
    "remark-gfm": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest",
    "jsdom": "latest",
    "typescript": "latest",
    "vite-tsconfig-paths": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and `node_modules` installs successfully.

- [ ] **Step 3: Add TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Add Next config**

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.vercel.app" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" }
    ]
  }
};

export default nextConfig;
```

- [ ] **Step 5: Add test configs**

Create `vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  }
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Add environment example**

Create `.env.example`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=example-anon-key
SUPABASE_SERVICE_ROLE_KEY=example-service-role-key
ADMIN_EMAILS=you@example.com
```

- [ ] **Step 7: Add minimal app shell**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI PM Portfolio",
  description: "AI product manager portfolio with prototypes, PRDs and project thinking."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/globals.css`:

```css
:root {
  --paper: #f7f2e8;
  --paper-2: #efe5d3;
  --ink: #17120d;
  --muted: #6c5a48;
  --line: #241a12;
  --accent: #c45532;
  --gold: #d6b36a;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: ui-serif, Georgia, "Times New Roman", "Songti SC", serif;
}

a {
  color: inherit;
}

button,
input,
textarea,
select {
  font: inherit;
}
```

Create `src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main>
      <h1>AI PM Portfolio</h1>
      <p>如果你只有 3 分钟认识我，可以先看看这些从“能不能做个 Demo”开始的 AI 产品原型。</p>
    </main>
  );
}
```

- [ ] **Step 8: Verify scaffold**

Run:

```bash
npm run typecheck
npm run build
```

Expected: `typecheck` and `build` pass.

- [ ] **Step 9: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts playwright.config.ts .env.example src
git commit -m "chore: scaffold Next.js portfolio app"
```

---

### Task 2: Domain Types, Validation, And Seed Fixtures

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/analytics/events.ts`
- Create: `src/lib/fixtures.ts`
- Test: `src/lib/analytics/events.test.ts`

- [ ] **Step 1: Write event validation tests**

Create `src/lib/analytics/events.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EventPayloadSchema, normalizeEventPayload } from "./events";

describe("EventPayloadSchema", () => {
  it("accepts a project expand event", () => {
    const parsed = EventPayloadSchema.parse({
      eventType: "project_expand",
      path: "/",
      projectId: "11111111-1111-4111-8111-111111111111",
      metadata: { expanded: true }
    });

    expect(parsed.eventType).toBe("project_expand");
    expect(parsed.metadata).toEqual({ expanded: true });
  });

  it("rejects browser environment fields that are outside first-version scope", () => {
    expect(() =>
      EventPayloadSchema.parse({
        eventType: "page_view",
        path: "/",
        metadata: { browser: "Chrome" }
      })
    ).toThrow();
  });
});

describe("normalizeEventPayload", () => {
  it("adds default metadata and clamps duration", () => {
    expect(
      normalizeEventPayload({
        eventType: "section_dwell",
        path: "/projects/agent",
        sectionId: "prd-overview",
        durationMs: 999_999
      })
    ).toMatchObject({
      eventType: "section_dwell",
      metadata: {},
      durationMs: 600_000
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/lib/analytics/events.test.ts
```

Expected: FAIL because `src/lib/analytics/events.ts` does not exist.

- [ ] **Step 3: Add domain types**

Create `src/lib/types.ts`:

```ts
export type ProjectStatus = "draft" | "published" | "hidden";

export type Profile = {
  id: string;
  displayName: string;
  title: string;
  headline: string;
  intro: string;
  contact: Record<string, string>;
  resumeSnapshot: string[];
  updatedAt: string;
};

export type Project = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  tags: string[];
  demoUrl: string;
  coverImageUrl: string | null;
  contribution: string;
  aiUsage: string;
  decisions: string;
  reflection: string;
  prdMarkdown: string;
  status: ProjectStatus;
  isFeatured: boolean;
  sortOrder: number;
  analyticsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Campaign = {
  id: string;
  company: string;
  role: string;
  jdUrl: string | null;
  jdSummary: string | null;
  tags: string[];
  channel: string;
  notes: string | null;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EventType =
  | "page_view"
  | "session_start"
  | "session_end"
  | "project_impression"
  | "project_expand"
  | "project_detail_view"
  | "prd_summary_expand"
  | "prd_full_view"
  | "prd_section_view"
  | "section_dwell"
  | "demo_click"
  | "external_link_click"
  | "resume_snapshot_view";
```

- [ ] **Step 4: Add event validation**

Create `src/lib/analytics/events.ts`:

```ts
import { z } from "zod";

export const EventTypeSchema = z.enum([
  "page_view",
  "session_start",
  "session_end",
  "project_impression",
  "project_expand",
  "project_detail_view",
  "prd_summary_expand",
  "prd_full_view",
  "prd_section_view",
  "section_dwell",
  "demo_click",
  "external_link_click",
  "resume_snapshot_view"
]);

const MetadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).superRefine((value, ctx) => {
  for (const blockedKey of ["browser", "os", "language", "screenWidth", "screenHeight"]) {
    if (blockedKey in value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `metadata.${blockedKey} is not collected in v1`
      });
    }
  }
});

export const EventPayloadSchema = z.object({
  eventType: EventTypeSchema,
  path: z.string().min(1).max(512),
  projectId: z.string().uuid().optional(),
  targetUrl: z.string().url().optional(),
  sectionId: z.string().min(1).max(120).optional(),
  durationMs: z.number().int().min(0).max(600_000).optional(),
  scrollDepth: z.number().min(0).max(100).optional(),
  metadata: MetadataSchema.default({})
});

export type EventPayload = z.infer<typeof EventPayloadSchema>;

export function normalizeEventPayload(input: unknown): EventPayload {
  const parsed = EventPayloadSchema.parse(input);
  return {
    ...parsed,
    durationMs: typeof parsed.durationMs === "number" ? Math.min(parsed.durationMs, 600_000) : parsed.durationMs,
    metadata: parsed.metadata ?? {}
  };
}
```

- [ ] **Step 5: Add seed fixtures for offline UI**

Create `src/lib/fixtures.ts`:

```ts
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
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- src/lib/analytics/events.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 7: Commit domain layer**

Run:

```bash
git add src/lib src/test
git commit -m "feat: add portfolio domain types and event validation"
```

---

### Task 3: Supabase Schema, RLS, And Seed Data

**Files:**
- Create: `supabase/migrations/202606100001_initial_schema.sql`
- Create: `supabase/seed.sql`
- Create: `src/lib/env.ts`

- [ ] **Step 1: Add environment validation**

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1)
});

const ServerEnvSchema = PublicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_EMAILS: z.string().min(3)
});

export function getPublicEnv() {
  return PublicEnvSchema.parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
}

export function getServerEnv() {
  return ServerEnvSchema.parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS
  });
}

export function getAdminEmails() {
  return getServerEnv()
    .ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
```

- [ ] **Step 2: Add database migration**

Create `supabase/migrations/202606100001_initial_schema.sql`:

```sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  title text not null,
  headline text not null,
  intro text not null,
  contact jsonb not null default '{}'::jsonb,
  resume_snapshot jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null,
  tags text[] not null default '{}',
  demo_url text not null,
  cover_image_url text,
  contribution text not null default '',
  ai_usage text not null default '',
  decisions text not null default '',
  reflection text not null default '',
  prd_markdown text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  is_featured boolean not null default false,
  sort_order integer not null default 100,
  analytics_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  jd_url text,
  jd_summary text,
  tags text[] not null default '{}',
  channel text not null default 'manual',
  notes text,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null unique,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references public.visitors(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  referrer text,
  ip_address inet,
  geo_country text,
  geo_region text,
  geo_city text,
  source_hint text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  visitor_id uuid references public.visitors(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  event_type text not null,
  project_id uuid references public.projects(id) on delete set null,
  path text not null,
  target_url text,
  section_id text,
  duration_ms integer,
  scroll_depth numeric,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_projects_public_sort on public.projects(status, is_featured, sort_order);
create index if not exists idx_campaigns_slug on public.campaigns(slug);
create index if not exists idx_sessions_campaign_started on public.sessions(campaign_id, started_at desc);
create index if not exists idx_events_session_time on public.events(session_id, occurred_at);
create index if not exists idx_events_project_type on public.events(project_id, event_type);
create index if not exists idx_events_campaign_type on public.events(campaign_id, event_type);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.campaigns enable row level security;
alter table public.visitors enable row level security;
alter table public.sessions enable row level security;
alter table public.events enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "Published projects are publicly readable" on public.projects;
create policy "Published projects are publicly readable"
on public.projects for select
to anon, authenticated
using (status = 'published');

insert into storage.buckets (id, name, public)
values ('project-covers', 'project-covers', true)
on conflict (id) do nothing;

drop policy if exists "Project covers are publicly readable" on storage.objects;
create policy "Project covers are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'project-covers');
```

- [ ] **Step 3: Add seed data**

Create `supabase/seed.sql`:

```sql
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
```

- [ ] **Step 4: Verify SQL locally or in Supabase SQL editor**

Run with Supabase CLI if available:

```bash
supabase db reset
```

Expected: migration and seed apply without SQL errors.

If Supabase CLI is unavailable, paste `supabase/migrations/202606100001_initial_schema.sql` and `supabase/seed.sql` into the Supabase SQL editor and confirm both finish successfully.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit schema**

Run:

```bash
git add supabase src/lib/env.ts
git commit -m "feat: add Supabase schema and seed data"
```

---

### Task 4: Supabase Clients And Admin Guard

**Files:**
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/auth/admin.ts`
- Test: `src/lib/auth/admin.test.ts`

- [ ] **Step 1: Write admin guard tests**

Create `src/lib/auth/admin.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isAllowedAdminEmail } from "./admin";

describe("isAllowedAdminEmail", () => {
  it("accepts an email in ADMIN_EMAILS", () => {
    expect(isAllowedAdminEmail("YOU@example.com", ["you@example.com"])).toBe(true);
  });

  it("rejects an email outside ADMIN_EMAILS", () => {
    expect(isAllowedAdminEmail("other@example.com", ["you@example.com"])).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/lib/auth/admin.test.ts
```

Expected: FAIL because `src/lib/auth/admin.ts` does not exist.

- [ ] **Step 3: Add Supabase SSR client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; Route Handlers handle refresh writes.
        }
      }
    }
  });
}
```

- [ ] **Step 4: Add service role client**

Create `src/lib/supabase/admin.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
```

- [ ] **Step 5: Add admin guard**

Create `src/lib/auth/admin.ts`:

```ts
import { redirect } from "next/navigation";
import { getAdminEmails } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function isAllowedAdminEmail(email: string | null | undefined, allowList = getAdminEmails()) {
  if (!email) return false;
  return allowList.includes(email.toLowerCase());
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user || !isAllowedAdminEmail(user.email)) {
    redirect("/login");
  }

  return user;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- src/lib/auth/admin.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 7: Commit auth utilities**

Run:

```bash
git add src/lib/supabase src/lib/auth src/lib/auth/admin.test.ts
git commit -m "feat: add Supabase clients and admin guard"
```

---

### Task 5: Public Data Access And Markdown Rendering

**Files:**
- Create: `src/lib/data/public.ts`
- Create: `src/lib/markdown.ts`
- Test: `src/lib/markdown.test.ts`

- [ ] **Step 1: Write Markdown helper tests**

Create `src/lib/markdown.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractMarkdownHeadings, summarizeMarkdown } from "./markdown";

describe("extractMarkdownHeadings", () => {
  it("returns h2 and h3 headings with stable ids", () => {
    expect(extractMarkdownHeadings("# Title\n\n## 用户场景\n\n### 关键路径")).toEqual([
      { depth: 2, text: "用户场景", id: "用户场景" },
      { depth: 3, text: "关键路径", id: "关键路径" }
    ]);
  });
});

describe("summarizeMarkdown", () => {
  it("strips headings and returns a concise summary", () => {
    expect(summarizeMarkdown("# Title\n\n这是一段 PRD 内容。\n\n## 背景", 8)).toBe("这是一段 PRD 内容。");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/lib/markdown.test.ts
```

Expected: FAIL because `src/lib/markdown.ts` does not exist.

- [ ] **Step 3: Add Markdown helpers**

Create `src/lib/markdown.ts`:

```ts
export type MarkdownHeading = {
  depth: 2 | 3;
  text: string;
  id: string;
};

export function headingId(text: string) {
  return text.trim().replace(/\s+/g, "-").toLowerCase();
}

export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  return markdown
    .split("\n")
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      depth: match[1].length as 2 | 3,
      text: match[2].trim(),
      id: headingId(match[2])
    }));
}

export function summarizeMarkdown(markdown: string, maxLength = 160) {
  const text = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}
```

- [ ] **Step 4: Add public data helpers**

Create `src/lib/data/public.ts`:

```ts
import { cache } from "react";
import { fixtureProfile, fixtureProjects } from "@/lib/fixtures";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile, Project } from "@/lib/types";

function toProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    displayName: String(row.display_name),
    title: String(row.title),
    headline: String(row.headline),
    intro: String(row.intro),
    contact: (row.contact ?? {}) as Record<string, string>,
    resumeSnapshot: (row.resume_snapshot ?? []) as string[],
    updatedAt: String(row.updated_at)
  };
}

function toProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    summary: String(row.summary),
    tags: (row.tags ?? []) as string[],
    demoUrl: String(row.demo_url),
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : null,
    contribution: String(row.contribution ?? ""),
    aiUsage: String(row.ai_usage ?? ""),
    decisions: String(row.decisions ?? ""),
    reflection: String(row.reflection ?? ""),
    prdMarkdown: String(row.prd_markdown ?? ""),
    status: row.status as Project["status"],
    isFeatured: Boolean(row.is_featured),
    sortOrder: Number(row.sort_order),
    analyticsEnabled: Boolean(row.analytics_enabled),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export const getPublicProfile = cache(async (): Promise<Profile> => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("profiles").select("*").limit(1).single();
    if (error || !data) return fixtureProfile;
    return toProfile(data);
  } catch {
    return fixtureProfile;
  }
});

export const getPublishedProjects = cache(async (): Promise<Project[]> => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    if (error || !data) return fixtureProjects;
    return data.map(toProject);
  } catch {
    return fixtureProjects;
  }
});

export async function getPublishedProjectBySlug(slug: string) {
  const projects = await getPublishedProjects();
  return projects.find((project) => project.slug === slug) ?? null;
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- src/lib/markdown.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit public data helpers**

Run:

```bash
git add src/lib/data/public.ts src/lib/markdown.ts src/lib/markdown.test.ts
git commit -m "feat: add public data and markdown helpers"
```

---

### Task 6: Public Interviewer Pages

**Files:**
- Create: `src/components/public/project-card.tsx`
- Create: `src/components/public/project-grid.tsx`
- Create: `src/components/public/site-footer.tsx`
- Create: `src/components/public/markdown-prd.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/projects/[slug]/page.tsx`
- Test: `src/components/public/project-card.test.tsx`
- Test: `tests/e2e/public.spec.ts`

- [ ] **Step 1: Write component test**

Create `src/components/public/project-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fixtureProjects } from "@/lib/fixtures";
import { ProjectCard } from "./project-card";

describe("ProjectCard", () => {
  it("renders project evidence and links", () => {
    render(<ProjectCard project={fixtureProjects[0]} />);

    expect(screen.getByText("Agent 协作原型")).toBeInTheDocument();
    expect(screen.getByText(/把产品-研发协作/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "阅读详情" })).toHaveAttribute(
      "href",
      "/projects/agent-collaboration-prototype"
    );
    expect(screen.getByRole("link", { name: "查看 Demo" })).toHaveAttribute("href", "https://example.vercel.app");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
npm test -- src/components/public/project-card.test.tsx
```

Expected: FAIL because `ProjectCard` does not exist.

- [ ] **Step 3: Add public components**

Create `src/components/public/project-card.tsx`:

```tsx
import Link from "next/link";
import type { Project } from "@/lib/types";
import { summarizeMarkdown } from "@/lib/markdown";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="project-card" data-project-id={project.id}>
      <div className="project-card__image" aria-label={`${project.title} 原型预览`}>
        {project.coverImageUrl ? <img src={project.coverImageUrl} alt={`${project.title} 首页预览`} /> : <span>Prototype Preview</span>}
      </div>
      <div className="project-card__body">
        <div className="tag-row">
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
        <details>
          <summary>展开项目证据</summary>
          <dl>
            <dt>我的贡献</dt>
            <dd>{project.contribution}</dd>
            <dt>AI 使用方式</dt>
            <dd>{project.aiUsage}</dd>
            <dt>关键判断</dt>
            <dd>{project.decisions}</dd>
            <dt>PRD 摘要</dt>
            <dd>{summarizeMarkdown(project.prdMarkdown, 120)}</dd>
          </dl>
        </details>
        <div className="action-row">
          <Link href={`/projects/${project.slug}`}>阅读详情</Link>
          <a href={project.demoUrl} target="_blank" rel="noreferrer">
            查看 Demo
          </a>
        </div>
      </div>
    </article>
  );
}
```

Create `src/components/public/project-grid.tsx`:

```tsx
import type { Project } from "@/lib/types";
import { ProjectCard } from "./project-card";

export function ProjectGrid({ projects }: { projects: Project[] }) {
  return (
    <section className="project-section" aria-labelledby="projects-title">
      <div className="section-heading">
        <p>Project Evidence Cards</p>
        <h2 id="projects-title">项目证据</h2>
      </div>
      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}
```

Create `src/components/public/site-footer.tsx`:

```tsx
export function SiteFooter() {
  return (
    <footer className="site-footer">
      我会用匿名访问数据观察这个作品集哪里更有用。如果你也好奇这些数据说明了什么，欢迎把它变成一道面试题。
    </footer>
  );
}
```

Create `src/components/public/markdown-prd.tsx`:

```tsx
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { extractMarkdownHeadings } from "@/lib/markdown";

export function MarkdownPrd({ markdown }: { markdown: string }) {
  const headings = extractMarkdownHeadings(markdown);

  return (
    <div className="prd-layout">
      <aside className="prd-toc" aria-label="PRD 目录">
        {headings.map((heading) => (
          <a key={`${heading.depth}-${heading.id}`} href={`#${heading.id}`} data-section-id={heading.id}>
            {heading.text}
          </a>
        ))}
      </aside>
      <article className="prd-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
```

- [ ] **Step 4: Implement public pages**

Replace `src/app/page.tsx`:

```tsx
import { ProjectGrid } from "@/components/public/project-grid";
import { SiteFooter } from "@/components/public/site-footer";
import { getPublicProfile, getPublishedProjects } from "@/lib/data/public";

export default async function HomePage() {
  const [profile, projects] = await Promise.all([getPublicProfile(), getPublishedProjects()]);
  const featured = projects.filter((project) => project.isFeatured).slice(0, 2);

  return (
    <main className="public-page">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">{profile.title}</p>
          <h1>你好，我是 {profile.displayName}</h1>
          <h2>{profile.headline}</h2>
          <p>{profile.intro}</p>
          <div className="ability-chain" aria-label="能力链">
            <span>场景识别</span>
            <span>问题定义</span>
            <span>AI 原型</span>
            <span>PRD 表达</span>
            <span>协作复盘</span>
          </div>
        </div>
        <div className="hero__feature">
          <p className="eyebrow">精选项目</p>
          {featured[0] ? (
            <>
              <h3>{featured[0].title}</h3>
              <p>{featured[0].summary}</p>
              <a href={`/projects/${featured[0].slug}`}>先看这个项目</a>
            </>
          ) : (
            <p>项目内容正在整理。</p>
          )}
        </div>
      </section>

      <ProjectGrid projects={projects} />

      <section className="resume-snapshot" aria-labelledby="resume-title">
        <h2 id="resume-title">经历摘要</h2>
        <ul>
          {profile.resumeSnapshot.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <SiteFooter />
    </main>
  );
}
```

Create `src/app/projects/[slug]/page.tsx`:

```tsx
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
      <Link href="/">返回作品集首页</Link>
      <header className="project-detail__header">
        <p className="eyebrow">{project.tags.join(" · ")}</p>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
        <a href={project.demoUrl} target="_blank" rel="noreferrer">
          查看真实 Demo
        </a>
      </header>
      <section className="detail-grid">
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
      <section>
        <h2>PRD</h2>
        <MarkdownPrd markdown={project.prdMarkdown} />
      </section>
      <SiteFooter />
    </main>
  );
}
```

- [ ] **Step 5: Extend CSS for public pages**

Append to `src/app/globals.css`:

```css
.public-page,
.project-detail {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 20px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 28px;
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: 10px 10px 0 var(--ink);
  padding: 28px;
}

.eyebrow {
  color: var(--accent);
  font-size: 12px;
  text-transform: uppercase;
}

.hero h1,
.hero h2,
.project-detail h1 {
  letter-spacing: 0;
}

.hero h1 {
  font-size: 42px;
  margin: 0 0 12px;
}

.hero h2 {
  font-size: 30px;
  line-height: 1.18;
  margin: 0 0 14px;
}

.hero p,
.project-card p,
.project-detail p {
  color: var(--muted);
  line-height: 1.7;
}

.hero__feature,
.project-card,
.resume-snapshot,
.detail-grid article {
  border: 1px solid var(--line);
  background: #fffdf8;
  padding: 18px;
}

.ability-chain,
.tag-row,
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ability-chain span,
.tag-row span {
  border: 1px solid var(--line);
  padding: 6px 8px;
  background: #fffdf8;
  font-size: 12px;
}

.project-section {
  margin-top: 52px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.project-card__image {
  display: grid;
  place-items: center;
  min-height: 150px;
  border: 1px solid var(--line);
  background: linear-gradient(135deg, #e7dcc9, #fffaf0);
  margin-bottom: 14px;
}

.project-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-card details {
  margin-top: 12px;
}

.project-card dt {
  font-weight: 700;
  margin-top: 10px;
}

.project-card dd {
  margin-left: 0;
  color: var(--muted);
}

.action-row a,
.hero__feature a,
.project-detail__header a {
  border: 1px solid var(--line);
  padding: 8px 10px;
  text-decoration: none;
  background: var(--ink);
  color: #fff;
}

.resume-snapshot {
  margin-top: 36px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.prd-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.prd-toc {
  position: sticky;
  top: 18px;
  display: grid;
  gap: 8px;
  border: 1px solid var(--line);
  padding: 12px;
  background: #fffdf8;
}

.prd-content {
  border: 1px solid var(--line);
  padding: 20px;
  background: #fffdf8;
}

.site-footer {
  margin-top: 48px;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 860px) {
  .hero,
  .project-grid,
  .detail-grid,
  .prd-layout {
    grid-template-columns: 1fr;
  }

  .hero {
    box-shadow: 6px 6px 0 var(--ink);
  }
}
```

- [ ] **Step 6: Add E2E public test**

Create `tests/e2e/public.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("public homepage shows identity, projects and footer data note", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /你好，我是/ })).toBeVisible();
  await expect(page.getByText(/3 分钟认识我/)).toBeVisible();
  await expect(page.getByText("Agent 协作原型")).toBeVisible();
  await expect(page.getByText(/匿名访问数据/)).toBeVisible();
});
```

- [ ] **Step 7: Run tests and build**

Run:

```bash
npm test -- src/components/public/project-card.test.tsx
npm run typecheck
npm run build
npm run test:e2e -- tests/e2e/public.spec.ts
```

Expected: all pass. If Supabase env is not configured, public pages use fixtures and still pass.

- [ ] **Step 8: Commit public pages**

Run:

```bash
git add src/components/public src/app/page.tsx src/app/projects tests/e2e/public.spec.ts src/app/globals.css
git commit -m "feat: build public portfolio pages"
```

---

### Task 7: Campaign Attribution And Event Ingestion

**Files:**
- Create: `src/lib/analytics/session.ts`
- Create: `src/lib/analytics/client.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/app/api/events/route.ts`
- Create: `src/app/v/[campaignSlug]/route.ts`
- Create: `src/components/analytics/page-view-tracker.tsx`
- Create: `src/components/analytics/project-impression.tsx`
- Create: `src/components/analytics/tracked-link.tsx`
- Modify: `src/components/public/project-card.tsx`
- Test: `src/lib/analytics/session.test.ts`
- Test: `tests/e2e/events.spec.ts`

- [ ] **Step 1: Write session helper tests**

Create `src/lib/analytics/session.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createAnonymousId, getCampaignCookieName } from "./session";

describe("createAnonymousId", () => {
  it("creates a stable prefix for visitor ids", () => {
    expect(createAnonymousId()).toMatch(/^visitor_[a-z0-9]+$/);
  });
});

describe("getCampaignCookieName", () => {
  it("returns the campaign cookie key", () => {
    expect(getCampaignCookieName()).toBe("portfolio_campaign");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
npm test -- src/lib/analytics/session.test.ts
```

Expected: FAIL because `src/lib/analytics/session.ts` does not exist.

- [ ] **Step 3: Add session helpers**

Create `src/lib/analytics/session.ts`:

```ts
export function createAnonymousId() {
  return `visitor_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function getVisitorCookieName() {
  return "portfolio_visitor";
}

export function getSessionCookieName() {
  return "portfolio_session";
}

export function getCampaignCookieName() {
  return "portfolio_campaign";
}
```

- [ ] **Step 4: Add campaign route handler**

Create `src/app/v/[campaignSlug]/route.ts`:

```ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCampaignCookieName } from "@/lib/analytics/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ campaignSlug: string }> }) {
  const { campaignSlug } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, slug, is_active")
    .eq("slug", campaignSlug)
    .eq("is_active", true)
    .single();

  if (!campaign) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set(getCampaignCookieName(), campaign.slug, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return NextResponse.redirect(new URL("/", request.url));
}
```

- [ ] **Step 5: Add event ingestion API**

Create `src/app/api/events/route.ts`:

```ts
import { geolocation, ipAddress, waitUntil } from "@vercel/functions";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { getCampaignCookieName, getSessionCookieName, getVisitorCookieName } from "@/lib/analytics/session";
import { normalizeEventPayload } from "@/lib/analytics/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const events = Array.isArray(body.events) ? body.events.map(normalizeEventPayload) : [normalizeEventPayload(body)];
  const cookieStore = await cookies();
  const requestHeaders = await headers();

  const anonymousId = cookieStore.get(getVisitorCookieName())?.value ?? crypto.randomUUID();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value ?? crypto.randomUUID();
  const campaignSlug = cookieStore.get(getCampaignCookieName())?.value;
  const referrer = requestHeaders.get("referer");
  const geo = geolocation(request);
  const ip = ipAddress(request);

  waitUntil(writeEvents({ anonymousId, sessionToken, campaignSlug, referrer, geo, ip, events }));

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getVisitorCookieName(), anonymousId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  response.cookies.set(getSessionCookieName(), sessionToken, { path: "/", sameSite: "lax", maxAge: 60 * 30 });
  return response;
}

async function writeEvents(input: {
  anonymousId: string;
  sessionToken: string;
  campaignSlug?: string;
  referrer: string | null;
  geo: ReturnType<typeof geolocation>;
  ip?: string;
  events: ReturnType<typeof normalizeEventPayload>[];
}) {
  const supabase = createSupabaseAdminClient();
  const { data: visitor } = await supabase
    .from("visitors")
    .upsert({ anonymous_id: input.anonymousId, last_seen_at: new Date().toISOString() }, { onConflict: "anonymous_id" })
    .select("id")
    .single();

  if (!visitor) return;

  const { data: campaign } = input.campaignSlug
    ? await supabase.from("campaigns").select("id").eq("slug", input.campaignSlug).single()
    : { data: null };

  const { data: session } = await supabase
    .from("sessions")
    .upsert(
      {
        id: input.sessionToken,
        visitor_id: visitor.id,
        campaign_id: campaign?.id ?? null,
        referrer: input.referrer,
        ip_address: input.ip ?? null,
        geo_country: input.geo.country ?? null,
        geo_region: input.geo.region ?? null,
        geo_city: input.geo.city ?? null,
        source_hint: input.campaignSlug ?? null,
        started_at: new Date().toISOString()
      },
      { onConflict: "id" }
    )
    .select("id")
    .single();

  if (!session) return;

  await supabase.from("events").insert(
    input.events.map((event) => ({
      session_id: session.id,
      visitor_id: visitor.id,
      campaign_id: campaign?.id ?? null,
      event_type: event.eventType,
      project_id: event.projectId ?? null,
      path: event.path,
      target_url: event.targetUrl ?? null,
      section_id: event.sectionId ?? null,
      duration_ms: event.durationMs ?? null,
      scroll_depth: event.scrollDepth ?? null,
      metadata: event.metadata
    }))
  );
}
```

- [ ] **Step 6: Add client-side batcher**

Create `src/lib/analytics/client.ts`:

```ts
"use client";

import type { EventPayload } from "./events";

let queue: EventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function trackEvent(event: EventPayload) {
  queue.push(event);
  if (flushTimer) return;
  flushTimer = setTimeout(() => void flushEvents(), 1200);
}

export async function flushEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const events = queue;
  queue = [];
  await fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ events }),
    keepalive: true
  });
}
```

- [ ] **Step 7: Add page view and click trackers**

Create `src/components/analytics/page-view-tracker.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackEvent({ eventType: "page_view", path: pathname, metadata: {} });
  }, [pathname]);

  return null;
}
```

Create `src/components/analytics/project-impression.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";

export function ProjectImpression({ projectId }: { projectId: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackEvent({
            eventType: "project_impression",
            path: window.location.pathname,
            projectId,
            metadata: {}
          });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [projectId]);

  return <div ref={ref} aria-hidden="true" />;
}
```

Create `src/components/analytics/tracked-link.tsx`:

```tsx
"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackEvent } from "@/lib/analytics/client";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventType: "project_detail_view" | "demo_click" | "external_link_click" | "prd_full_view";
  projectId?: string;
  targetUrl?: string;
};

export function TrackedLink({ eventType, projectId, targetUrl, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackEvent({
          eventType,
          path: window.location.pathname,
          projectId,
          targetUrl,
          metadata: {}
        });
        onClick?.(event);
      }}
    />
  );
}
```

- [ ] **Step 8: Wire trackers into layout and project cards**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI PM Portfolio",
  description: "AI product manager portfolio with prototypes, PRDs and project thinking."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <PageViewTracker />
      </body>
    </html>
  );
}
```

Modify `src/components/public/project-card.tsx` so its links and impression use trackers:

```tsx
import type { Project } from "@/lib/types";
import { ProjectImpression } from "@/components/analytics/project-impression";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { summarizeMarkdown } from "@/lib/markdown";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="project-card" data-project-id={project.id}>
      <ProjectImpression projectId={project.id} />
      <div className="project-card__image" aria-label={`${project.title} 原型预览`}>
        {project.coverImageUrl ? <img src={project.coverImageUrl} alt={`${project.title} 首页预览`} /> : <span>Prototype Preview</span>}
      </div>
      <div className="project-card__body">
        <div className="tag-row">
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
        <details>
          <summary>展开项目证据</summary>
          <dl>
            <dt>我的贡献</dt>
            <dd>{project.contribution}</dd>
            <dt>AI 使用方式</dt>
            <dd>{project.aiUsage}</dd>
            <dt>关键判断</dt>
            <dd>{project.decisions}</dd>
            <dt>PRD 摘要</dt>
            <dd>{summarizeMarkdown(project.prdMarkdown, 120)}</dd>
          </dl>
        </details>
        <div className="action-row">
          <TrackedLink href={`/projects/${project.slug}`} eventType="project_detail_view" projectId={project.id}>
            阅读详情
          </TrackedLink>
          <TrackedLink href={project.demoUrl} eventType="demo_click" projectId={project.id} targetUrl={project.demoUrl} target="_blank" rel="noreferrer">
            查看 Demo
          </TrackedLink>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 9: Add E2E campaign smoke test**

Create `tests/e2e/events.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("campaign links resolve through /v slug", async ({ page }) => {
  await page.goto("/v/sample-ai-pm");
  await expect(page).toHaveURL("/");
  await expect(page.getByText(/3 分钟认识我/)).toBeVisible();
});
```

- [ ] **Step 10: Run tests**

Run:

```bash
npm test -- src/lib/analytics/session.test.ts src/lib/analytics/events.test.ts
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 11: Commit tracking foundation**

Run:

```bash
git add src/lib/analytics src/app/api/events src/app/v src/components/analytics src/components/public/project-card.tsx src/app/layout.tsx tests/e2e/events.spec.ts
git commit -m "feat: add campaign attribution and event ingestion"
```

---

### Task 8: Admin Login And Shell

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/admin-shell.tsx`
- Test: `tests/e2e/admin-auth.spec.ts`

- [ ] **Step 1: Add login page**

Create `src/app/login/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;

  async function signIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const supabase = await createSupabaseServerClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` }
    });
    redirect("/login?message=check-email");
  }

  return (
    <main className="login-page">
      <form action={signIn} className="login-card">
        <h1>后台登录</h1>
        <p>只允许白名单邮箱登录，不开放注册。</p>
        <input name="email" type="email" required placeholder="你的邮箱" />
        <button type="submit">发送登录链接</button>
        {message === "check-email" ? <p role="status">登录链接已发送，请检查邮箱。</p> : null}
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Add auth callback**

Create `src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/admin", url.origin));
}
```

- [ ] **Step 3: Add admin shell**

Create `src/components/admin/admin-shell.tsx`:

```tsx
import Link from "next/link";

const navItems = [
  ["数据驾驶舱", "/admin/analytics"],
  ["投递追踪链接", "/admin/campaigns"],
  ["项目管理", "/admin/projects"],
  ["经历摘要", "/admin/profile"],
  ["备份导出", "/admin/backups"]
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside>
        <h1>Portfolio Admin</h1>
        <nav>
          {navItems.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}
```

Create `src/app/admin/layout.tsx`:

```tsx
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
```

Create `src/app/admin/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  redirect("/admin/analytics");
}
```

- [ ] **Step 4: Add admin CSS**

Append to `src/app/globals.css`:

```css
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.login-card {
  width: min(420px, 100%);
  border: 1px solid var(--line);
  background: #fffdf8;
  padding: 28px;
  box-shadow: 8px 8px 0 var(--ink);
}

.login-card input,
.login-card button,
.admin-form input,
.admin-form textarea,
.admin-form select {
  width: 100%;
  border: 1px solid var(--line);
  padding: 10px;
  background: #fffdf8;
}

.login-card button,
.admin-form button {
  background: var(--ink);
  color: #fff;
  cursor: pointer;
}

.admin-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
}

.admin-shell aside {
  border-right: 1px solid var(--line);
  background: var(--paper-2);
  padding: 20px;
}

.admin-shell nav {
  display: grid;
  gap: 8px;
}

.admin-shell nav a {
  border: 1px solid var(--line);
  padding: 10px;
  background: #fffdf8;
  text-decoration: none;
}

.admin-shell main {
  padding: 24px;
}
```

- [ ] **Step 5: Add E2E auth redirect test**

Create `tests/e2e/admin-auth.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("admin redirects anonymous users to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "后台登录" })).toBeVisible();
});
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm run typecheck
npm run build
npm run test:e2e -- tests/e2e/admin-auth.spec.ts
```

Expected: anonymous `/admin` access redirects to `/login`.

- [ ] **Step 7: Commit admin shell**

Run:

```bash
git add src/app/login src/app/auth src/app/admin src/components/admin src/app/globals.css tests/e2e/admin-auth.spec.ts
git commit -m "feat: add admin login and shell"
```

---

### Task 9: Admin Project And Campaign APIs

**Files:**
- Create: `src/lib/data/admin.ts`
- Create: `src/app/api/admin/projects/route.ts`
- Create: `src/app/api/admin/projects/[id]/route.ts`
- Create: `src/app/api/admin/campaigns/route.ts`

- [ ] **Step 1: Add admin data helpers**

Create `src/lib/data/admin.ts`:

```ts
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const ProjectInputSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
  demoUrl: z.string().url(),
  coverImageUrl: z.string().url().nullable().default(null),
  contribution: z.string().default(""),
  aiUsage: z.string().default(""),
  decisions: z.string().default(""),
  reflection: z.string().default(""),
  prdMarkdown: z.string().default(""),
  status: z.enum(["draft", "published", "hidden"]).default("draft"),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(100),
  analyticsEnabled: z.boolean().default(true)
});

export const CampaignInputSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  jdUrl: z.string().url().nullable().default(null),
  jdSummary: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  channel: z.string().default("manual"),
  notes: z.string().nullable().default(null),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  isActive: z.boolean().default(true)
});

export async function listAdminProjects() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("projects").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertProject(input: unknown, id?: string) {
  const parsed = ProjectInputSchema.parse(input);
  const supabase = createSupabaseAdminClient();
  const row = {
    title: parsed.title,
    slug: parsed.slug,
    summary: parsed.summary,
    tags: parsed.tags,
    demo_url: parsed.demoUrl,
    cover_image_url: parsed.coverImageUrl,
    contribution: parsed.contribution,
    ai_usage: parsed.aiUsage,
    decisions: parsed.decisions,
    reflection: parsed.reflection,
    prd_markdown: parsed.prdMarkdown,
    status: parsed.status,
    is_featured: parsed.isFeatured,
    sort_order: parsed.sortOrder,
    analytics_enabled: parsed.analyticsEnabled,
    updated_at: new Date().toISOString()
  };

  const query = id ? supabase.from("projects").update(row).eq("id", id) : supabase.from("projects").insert(row);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProjectCover(file: File) {
  if (file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("Project cover must be an image file.");
  }

  const supabase = createSupabaseAdminClient();
  const extension = file.name.split(".").pop() ?? "png";
  const path = `covers/${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from("project-covers").upload(path, bytes, {
    contentType: file.type,
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from("project-covers").getPublicUrl(path);
  return data.publicUrl;
}

export async function listCampaigns() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCampaign(input: unknown) {
  const parsed = CampaignInputSchema.parse(input);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      company: parsed.company,
      role: parsed.role,
      jd_url: parsed.jdUrl,
      jd_summary: parsed.jdSummary,
      tags: parsed.tags,
      channel: parsed.channel,
      notes: parsed.notes,
      slug: parsed.slug,
      is_active: parsed.isActive
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Add admin project routes**

Create `src/app/api/admin/projects/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminProjects, upsertProject } from "@/lib/data/admin";

export async function GET() {
  await requireAdmin();
  return NextResponse.json({ projects: await listAdminProjects() });
}

export async function POST(request: Request) {
  await requireAdmin();
  const project = await upsertProject(await request.json());
  return NextResponse.json({ project });
}
```

Create `src/app/api/admin/projects/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { deleteProject, upsertProject } from "@/lib/data/admin";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const project = await upsertProject(await request.json(), id);
  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  await deleteProject(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Add campaign route**

Create `src/app/api/admin/campaigns/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createCampaign, listCampaigns } from "@/lib/data/admin";

export async function GET() {
  await requireAdmin();
  return NextResponse.json({ campaigns: await listCampaigns() });
}

export async function POST(request: Request) {
  await requireAdmin();
  const campaign = await createCampaign(await request.json());
  return NextResponse.json({ campaign });
}
```

- [ ] **Step 4: Verify APIs compile**

Run:

```bash
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit admin APIs**

Run:

```bash
git add src/lib/data/admin.ts src/app/api/admin
git commit -m "feat: add admin project and campaign APIs"
```

---

### Task 10: Admin Project, Campaign, Profile, And Backup Pages

**Files:**
- Create: `src/app/admin/projects/page.tsx`
- Create: `src/app/admin/campaigns/page.tsx`
- Create: `src/app/admin/profile/page.tsx`
- Create: `src/app/admin/backups/page.tsx`
- Create: `src/app/api/admin/profile/route.ts`
- Create: `src/app/api/admin/backups/route.ts`

- [ ] **Step 1: Add project admin page**

Create `src/app/admin/projects/page.tsx`:

```tsx
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminProjects } from "@/lib/data/admin";
import { uploadProjectCover, upsertProject } from "@/lib/data/admin";

export default async function AdminProjectsPage() {
  const projects = await listAdminProjects();

  async function createProject(formData: FormData) {
    "use server";
    await requireAdmin();
    const coverFile = formData.get("coverFile");
    const uploadedCoverUrl = coverFile instanceof File ? await uploadProjectCover(coverFile) : null;
    await upsertProject({
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      demoUrl: String(formData.get("demoUrl") ?? ""),
      coverImageUrl: uploadedCoverUrl ?? (String(formData.get("coverImageUrl") ?? "") || null),
      contribution: String(formData.get("contribution") ?? ""),
      aiUsage: String(formData.get("aiUsage") ?? ""),
      decisions: String(formData.get("decisions") ?? ""),
      reflection: String(formData.get("reflection") ?? ""),
      prdMarkdown: String(formData.get("prdMarkdown") ?? ""),
      status: String(formData.get("status") ?? "draft"),
      isFeatured: formData.get("isFeatured") === "on",
      sortOrder: Number(formData.get("sortOrder") ?? 100),
      analyticsEnabled: formData.get("analyticsEnabled") !== "off"
    });
    revalidatePath("/admin/projects");
    revalidatePath("/");
  }

  return (
    <section>
      <h1>项目管理</h1>
      <p>新增、编辑、公开、隐藏、精选和排序项目。Markdown PRD 可粘贴到项目表单中。</p>
      <div className="admin-table">
        {projects.map((project) => (
          <article key={project.id}>
            <h2>{project.title}</h2>
            <p>{project.summary}</p>
            <p>
              状态：{project.status} · 精选：{project.is_featured ? "是" : "否"} · 排序：{project.sort_order}
            </p>
          </article>
        ))}
      </div>
      <form className="admin-form" action={createProject}>
        <h2>新增项目</h2>
        <input name="title" required placeholder="项目标题" />
        <input name="slug" required placeholder="project-slug" />
        <input name="tags" placeholder="Agent, AI Workflow, PRD" />
        <input name="demoUrl" required placeholder="https://demo.example.com" />
        <input name="coverImageUrl" placeholder="https://.../cover.png" />
        <input name="coverFile" type="file" accept="image/*" />
        <input name="sortOrder" type="number" defaultValue="100" />
        <select name="status" defaultValue="draft">
          <option value="draft">草稿</option>
          <option value="published">公开</option>
          <option value="hidden">隐藏</option>
        </select>
        <label><input name="isFeatured" type="checkbox" /> 首页精选</label>
        <textarea name="summary" required placeholder="一句话项目结论" />
        <textarea name="contribution" placeholder="我的贡献" />
        <textarea name="aiUsage" placeholder="AI 使用方式" />
        <textarea name="decisions" placeholder="关键判断 / 取舍" />
        <textarea name="reflection" placeholder="项目思考" />
        <textarea name="prdMarkdown" placeholder="Markdown PRD" />
        <button type="submit">保存项目</button>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Add campaign admin page**

Create `src/app/admin/campaigns/page.tsx`:

```tsx
import { revalidatePath } from "next/cache";
import { getPublicEnv } from "@/lib/env";
import { requireAdmin } from "@/lib/auth/admin";
import { createCampaign, listCampaigns } from "@/lib/data/admin";

export default async function AdminCampaignsPage() {
  const [campaigns, env] = await Promise.all([listCampaigns(), Promise.resolve(getPublicEnv())]);

  async function createCampaignAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await createCampaign({
      company: String(formData.get("company") ?? ""),
      role: String(formData.get("role") ?? ""),
      jdUrl: String(formData.get("jdUrl") ?? "") || null,
      jdSummary: String(formData.get("jdSummary") ?? "") || null,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      channel: String(formData.get("channel") ?? "manual"),
      notes: String(formData.get("notes") ?? "") || null,
      slug: String(formData.get("slug") ?? ""),
      isActive: formData.get("isActive") !== "off"
    });
    revalidatePath("/admin/campaigns");
  }

  return (
    <section>
      <h1>投递追踪链接</h1>
      <p>为重点公司或岗位创建专属链接，后续访问事件会关联到对应投递记录。</p>
      <div className="admin-table">
        {campaigns.map((campaign) => (
          <article key={campaign.id}>
            <h2>{campaign.company} · {campaign.role}</h2>
            <p>{campaign.jd_summary}</p>
            <code>{`${env.NEXT_PUBLIC_SITE_URL}/v/${campaign.slug}`}</code>
          </article>
        ))}
      </div>
      <form className="admin-form" action={createCampaignAction}>
        <h2>新增投递链接</h2>
        <input name="company" required placeholder="公司名称" />
        <input name="role" required placeholder="岗位名称" />
        <input name="slug" required placeholder="company-role-2026" />
        <input name="jdUrl" placeholder="JD 链接" />
        <input name="tags" placeholder="Agent, ToB, AI PM" />
        <input name="channel" placeholder="投递渠道" defaultValue="manual" />
        <textarea name="jdSummary" placeholder="JD 摘要" />
        <textarea name="notes" placeholder="备注" />
        <button type="submit">生成追踪链接</button>
      </form>
    </section>
  );
}
```

- [ ] **Step 3: Add profile API and page**

Create `src/app/api/admin/profile/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ProfileInputSchema = z.object({
  displayName: z.string().min(1),
  title: z.string().min(1),
  headline: z.string().min(1),
  intro: z.string().min(1),
  contact: z.record(z.string(), z.string()).default({}),
  resumeSnapshot: z.array(z.string()).default([])
});

export async function PUT(request: Request) {
  await requireAdmin();
  const parsed = ProfileInputSchema.parse(await request.json());
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.displayName,
      title: parsed.title,
      headline: parsed.headline,
      intro: parsed.intro,
      contact: parsed.contact,
      resume_snapshot: parsed.resumeSnapshot,
      updated_at: new Date().toISOString()
    })
    .eq("id", "00000000-0000-4000-8000-000000000001")
    .select("*")
    .single();

  if (error) throw error;
  return NextResponse.json({ profile: data });
}
```

Create `src/app/admin/profile/page.tsx`:

```tsx
import { getPublicProfile } from "@/lib/data/public";

export default async function AdminProfilePage() {
  const profile = await getPublicProfile();

  return (
    <section>
      <h1>经历摘要</h1>
      <p>维护公开页个人信息、首屏文案和经历摘要。</p>
      <div className="admin-card">
        <h2>{profile.displayName}</h2>
        <p>{profile.title}</p>
        <p>{profile.headline}</p>
        <ul>
          {profile.resumeSnapshot.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add backup API and page**

Create `src/app/api/admin/backups/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const [profiles, projects, campaigns, sessions, events] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("projects").select("*"),
    supabase.from("campaigns").select("*"),
    supabase.from("sessions").select("*"),
    supabase.from("events").select("*")
  ]);

  return NextResponse.json(
    {
      exportedAt: new Date().toISOString(),
      profiles: profiles.data ?? [],
      projects: projects.data ?? [],
      campaigns: campaigns.data ?? [],
      sessions: sessions.data ?? [],
      events: events.data ?? []
    },
    {
      headers: {
        "content-disposition": `attachment; filename="portfolio-backup-${new Date().toISOString().slice(0, 10)}.json"`
      }
    }
  );
}
```

Create `src/app/admin/backups/page.tsx`:

```tsx
export default function AdminBackupsPage() {
  return (
    <section>
      <h1>备份导出</h1>
      <p>导出项目、Markdown PRD、项目思考、投递记录和访问统计数据。</p>
      <a className="admin-download" href="/api/admin/backups">
        导出 JSON 备份
      </a>
    </section>
  );
}
```

- [ ] **Step 5: Add admin table/card CSS**

Append to `src/app/globals.css`:

```css
.admin-table {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.admin-table article,
.admin-card {
  border: 1px solid var(--line);
  background: #fffdf8;
  padding: 16px;
}

.admin-form {
  display: grid;
  gap: 10px;
  margin-top: 24px;
  border: 1px solid var(--line);
  background: var(--paper-2);
  padding: 16px;
}

.admin-download {
  display: inline-block;
  border: 1px solid var(--line);
  background: var(--ink);
  color: #fff;
  padding: 10px 12px;
  text-decoration: none;
}
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit admin pages**

Run:

```bash
git add src/app/admin src/app/api/admin src/app/globals.css
git commit -m "feat: add admin management pages and backup export"
```

---

### Task 11: Analytics Aggregation And Dashboard

**Files:**
- Create: `src/lib/data/analytics.ts`
- Create: `src/lib/data/analytics.test.ts`
- Create: `src/app/admin/analytics/page.tsx`
- Create: `src/components/admin/analytics-dashboard.tsx`

- [ ] **Step 1: Write analytics aggregation tests**

Create `src/lib/data/analytics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarizeProjectInterest } from "./analytics";

describe("summarizeProjectInterest", () => {
  it("counts project events by type", () => {
    expect(
      summarizeProjectInterest([
        { project_id: "p1", event_type: "project_impression", duration_ms: null },
        { project_id: "p1", event_type: "project_expand", duration_ms: 1000 },
        { project_id: "p1", event_type: "demo_click", duration_ms: null },
        { project_id: "p2", event_type: "project_impression", duration_ms: null }
      ])
    ).toEqual([
      {
        projectId: "p1",
        impressions: 1,
        expands: 1,
        detailViews: 0,
        prdDeepReads: 0,
        demoClicks: 1,
        averageDwellSeconds: 1
      },
      {
        projectId: "p2",
        impressions: 1,
        expands: 0,
        detailViews: 0,
        prdDeepReads: 0,
        demoClicks: 0,
        averageDwellSeconds: 0
      }
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
npm test -- src/lib/data/analytics.test.ts
```

Expected: FAIL because `src/lib/data/analytics.ts` does not exist.

- [ ] **Step 3: Add analytics helpers**

Create `src/lib/data/analytics.ts`:

```ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EventRow = {
  project_id: string | null;
  event_type: string;
  duration_ms: number | null;
};

export type ProjectInterest = {
  projectId: string;
  impressions: number;
  expands: number;
  detailViews: number;
  prdDeepReads: number;
  demoClicks: number;
  averageDwellSeconds: number;
};

export function summarizeProjectInterest(events: EventRow[]): ProjectInterest[] {
  const map = new Map<string, ProjectInterest & { dwellTotalMs: number; dwellCount: number }>();

  for (const event of events) {
    if (!event.project_id) continue;
    const current =
      map.get(event.project_id) ??
      {
        projectId: event.project_id,
        impressions: 0,
        expands: 0,
        detailViews: 0,
        prdDeepReads: 0,
        demoClicks: 0,
        averageDwellSeconds: 0,
        dwellTotalMs: 0,
        dwellCount: 0
      };

    if (event.event_type === "project_impression") current.impressions += 1;
    if (event.event_type === "project_expand") current.expands += 1;
    if (event.event_type === "project_detail_view") current.detailViews += 1;
    if (event.event_type === "prd_full_view") current.prdDeepReads += 1;
    if (event.event_type === "demo_click") current.demoClicks += 1;
    if (typeof event.duration_ms === "number") {
      current.dwellTotalMs += event.duration_ms;
      current.dwellCount += 1;
    }

    current.averageDwellSeconds = current.dwellCount === 0 ? 0 : Math.round(current.dwellTotalMs / current.dwellCount / 1000);
    map.set(event.project_id, current);
  }

  return [...map.values()].map(({ dwellTotalMs, dwellCount, ...item }) => item);
}

export async function getAnalyticsDashboard() {
  const supabase = createSupabaseAdminClient();
  const [eventsResult, sessionsResult, campaignsResult, projectsResult] = await Promise.all([
    supabase.from("events").select("*").order("occurred_at", { ascending: false }).limit(1000),
    supabase.from("sessions").select("*").order("started_at", { ascending: false }).limit(300),
    supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("projects").select("id,title,slug").order("sort_order", { ascending: true })
  ]);

  const events = eventsResult.data ?? [];
  return {
    kpis: {
      sessions: sessionsResult.data?.length ?? 0,
      projectExpands: events.filter((event) => event.event_type === "project_expand").length,
      prdDeepReads: events.filter((event) => event.event_type === "prd_full_view").length,
      demoClicks: events.filter((event) => event.event_type === "demo_click").length,
      returnSessions: 0
    },
    projectInterest: summarizeProjectInterest(events),
    sessions: sessionsResult.data ?? [],
    campaigns: campaignsResult.data ?? [],
    projects: projectsResult.data ?? [],
    recentEvents: events.slice(0, 20)
  };
}
```

- [ ] **Step 4: Add dashboard component and page**

Create `src/components/admin/analytics-dashboard.tsx`:

```tsx
import type { ProjectInterest } from "@/lib/data/analytics";

export function AnalyticsDashboard({
  kpis,
  projectInterest,
  recentEvents
}: {
  kpis: { sessions: number; projectExpands: number; prdDeepReads: number; demoClicks: number; returnSessions: number };
  projectInterest: ProjectInterest[];
  recentEvents: Array<{ id: string; event_type: string; path: string; occurred_at: string }>;
}) {
  return (
    <div className="analytics-dashboard">
      <div className="kpi-grid">
        <Kpi label="访问会话" value={kpis.sessions} />
        <Kpi label="项目展开" value={kpis.projectExpands} />
        <Kpi label="PRD 深读" value={kpis.prdDeepReads} />
        <Kpi label="Demo 点击" value={kpis.demoClicks} />
        <Kpi label="回访会话" value={kpis.returnSessions} />
      </div>
      <section className="admin-card">
        <h2>项目兴趣明细</h2>
        <table>
          <thead>
            <tr>
              <th>项目</th>
              <th>曝光</th>
              <th>展开</th>
              <th>详情</th>
              <th>PRD</th>
              <th>Demo</th>
              <th>均停留</th>
            </tr>
          </thead>
          <tbody>
            {projectInterest.map((item) => (
              <tr key={item.projectId}>
                <td>{item.projectId}</td>
                <td>{item.impressions}</td>
                <td>{item.expands}</td>
                <td>{item.detailViews}</td>
                <td>{item.prdDeepReads}</td>
                <td>{item.demoClicks}</td>
                <td>{item.averageDwellSeconds}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="admin-card">
        <h2>最近事件</h2>
        {recentEvents.map((event) => (
          <p key={event.id}>
            {event.event_type} · {event.path} · {new Date(event.occurred_at).toLocaleString("zh-CN")}
          </p>
        ))}
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <article className="kpi-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
```

Create `src/app/admin/analytics/page.tsx`:

```tsx
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { getAnalyticsDashboard } from "@/lib/data/analytics";

export default async function AdminAnalyticsPage() {
  const dashboard = await getAnalyticsDashboard();
  return (
    <section>
      <h1>数据驾驶舱</h1>
      <p>这里只呈现真实行为事实：哪些项目被看、被展开、被深读、被点击。</p>
      <AnalyticsDashboard {...dashboard} />
    </section>
  );
}
```

- [ ] **Step 5: Add dashboard CSS**

Append to `src/app/globals.css`:

```css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.kpi-card {
  border: 1px solid var(--line);
  background: #fffdf8;
  padding: 14px;
}

.kpi-card strong {
  display: block;
  font-size: 28px;
}

.analytics-dashboard table {
  width: 100%;
  border-collapse: collapse;
}

.analytics-dashboard th,
.analytics-dashboard td {
  border-bottom: 1px solid #d0c0aa;
  padding: 8px;
  text-align: left;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- src/lib/data/analytics.test.ts
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 7: Commit analytics dashboard**

Run:

```bash
git add src/lib/data/analytics.ts src/lib/data/analytics.test.ts src/components/admin/analytics-dashboard.tsx src/app/admin/analytics src/app/globals.css
git commit -m "feat: add analytics dashboard"
```

---

### Task 12: Final Verification And Deployment Prep

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Add README**

Create `README.md`:

```md
# AI PM Portfolio

一个面向 AI 产品经理实习面试的作品集网站，包含公开作品集、白名单后台、项目/PRD 管理、投递追踪链接和访问行为监控。

## Local Development

1. Copy `.env.example` to `.env.local`.
2. Fill Supabase URL, anon key, service role key and `ADMIN_EMAILS`.
3. Run `npm install`.
4. Run `npm run dev`.

## Required Environment Variables

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`

## Main Routes

- `/` public portfolio.
- `/projects/[slug]` project detail.
- `/v/[campaignSlug]` campaign attribution entry.
- `/admin` admin console.
- `/admin/analytics` behavior dashboard.
- `/admin/projects` project management.
- `/admin/campaigns` campaign links.
- `/admin/profile` profile and resume snapshot.
- `/admin/backups` JSON backup.

## Verification

Run:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Deployment Notes

Deploy to Vercel and set the same environment variables in the Vercel project settings. Supabase stores the primary data; Vercel Analytics is not the source of truth for behavior data.
```

- [ ] **Step 2: Ensure `.gitignore` protects local secrets**

Append to `.gitignore` if missing:

```gitignore
.env
.env.local
.env.*.local
test-results/
playwright-report/
.next/
node_modules/
```

- [ ] **Step 3: Run full local verification**

Run:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: typecheck, unit tests, production build and E2E tests pass.

- [ ] **Step 4: Open local app for visual verification**

Run:

```bash
npm run dev
```

Open `http://localhost:3000` and verify:

- Public homepage shows personal opening copy, featured project, evidence cards and footer data note.
- Project detail renders Markdown PRD and project thinking.
- `/v/sample-ai-pm` redirects to `/`.
- `/admin` redirects anonymous users to `/login`.

- [ ] **Step 5: Commit verification docs**

Run:

```bash
git add README.md .gitignore
git commit -m "docs: add setup and verification guide"
```

---

## Self-Review

### Spec Coverage

- Public interviewer page: Task 6.
- Project detail and Markdown PRD: Tasks 5 and 6.
- White-list admin login: Tasks 4 and 8.
- Project/PRD management: Tasks 9 and 10.
- Campaign links: Tasks 7, 9 and 10.
- Behavior monitoring: Tasks 2, 7 and 11.
- No AI diagnosis: Task 11 only aggregates facts.
- Backup export: Task 10.
- Supabase schema/RLS: Task 3.
- Vercel-compatible route handlers: Tasks 7, 8, 9 and 10.
- Final verification: Task 12.

### Example Value Scan

The plan intentionally uses example local values in `.env.example` and seed data. Implementation must set `.env.local` values to real Supabase project keys and the real admin email before deploying.

### Type Consistency

The domain type field names are camelCase in TypeScript and snake_case in Supabase rows. Conversion boundaries live in `src/lib/data/public.ts` and `src/lib/data/admin.ts`. Event names are defined in `src/lib/types.ts` and validated in `src/lib/analytics/events.ts`.
