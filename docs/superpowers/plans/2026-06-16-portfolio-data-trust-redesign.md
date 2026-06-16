# Portfolio Data Trust Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a trustworthy, sustainable AI PM portfolio where public content stays editable, campaign URLs preserve attribution, project management supports full CRUD, and analytics show only real visitor behavior.

**Architecture:** Keep the existing Next.js App Router structure and Supabase-backed data model. Prioritize server-side data correctness in `src/lib/data/*`, then wire focused UI components into public/admin pages. Preserve legacy analytics events while introducing the approved canonical behavior so old data still renders.

**Tech Stack:** Next.js App Router, React Server Components, Supabase Postgres/Auth/Storage, TypeScript, Zod, Vitest, Playwright, lucide-react.

---

## File Structure Map

- Modify `src/lib/types.ts`: event taxonomy and public/admin shared types.
- Modify `src/lib/data/public.ts`: remove production fixture fallback for configured Supabase, expose fresh public data helpers.
- Modify `src/app/page.tsx`: force fresh rendering and use redesigned public sections.
- Modify `src/app/v/[campaignSlug]/route.ts`: rewrite to `/` while preserving `/v/:campaignSlug` URL and campaign cookie.
- Modify `src/app/projects/[slug]/page.tsx`: force fresh rendering and emit canonical detail/PRD events.
- Modify `src/app/api/events/route.ts`: stop storing raw IP and ingest canonical event payloads.
- Add a Supabase migration via `npx supabase migration new remove_session_ip_address`: remove `sessions.ip_address`.
- Modify `supabase/seed.sql`: stop seeding the two mock production projects.
- Add `scripts/backup-and-delete-mock-projects.mjs`: export and remove known mock projects from production Supabase.
- Modify `src/lib/data/admin.ts`: add project lookup, update/delete helpers, data volume summary, and shared revalidation hooks where needed.
- Modify `src/app/admin/projects/page.tsx`: add edit/delete/reorder/publish/featured controls.
- Add `src/components/admin/project-delete-button.tsx`: client-side delete confirmation.
- Modify `src/app/api/admin/projects/[id]/route.ts`: revalidate affected public/admin paths after PUT/DELETE.
- Modify `src/app/api/admin/backups/route.ts`: include analytics summary and avoid raw IP fields.
- Modify `src/lib/data/analytics.ts`: remove IP types, add session pagination/detail helpers, canonical event aggregation, empty-safe summaries.
- Modify `src/components/admin/analytics-dashboard.tsx`: replace inline recent sessions with paginated summary table and no-IP UI.
- Add `src/app/admin/analytics/sessions/[sessionId]/page.tsx`: session detail page.
- Add `src/components/admin/session-detail.tsx`: detailed event timeline UI.
- Add `src/components/public/resume-evidence.tsx`: compact experience evidence blocks.
- Replace or modify `src/components/public/project-grid.tsx` and `src/components/public/project-card.tsx`: timeline/index project experience layout.
- Modify `src/app/globals.css`: public timeline, resume blocks, admin project editor, analytics session list/detail styles.
- Update tests in `src/**/*.test.ts`, `tests/e2e/*.spec.ts`.

## Task 1: Remove Raw IP From Analytics Storage

**Files:**
- Modify: `src/app/api/events/route.ts`
- Modify: `src/lib/data/analytics.ts`
- Modify: `src/components/admin/analytics-dashboard.tsx`
- Modify: `src/app/api/events/route.test.ts`
- Modify: `src/lib/data/analytics.test.ts`
- Create migration with CLI: `supabase/migrations/<generated>_remove_session_ip_address.sql`

- [ ] **Step 1: Create failing route test that proves IP is not written**

Add this test to `src/app/api/events/route.test.ts`. Replace the existing Supabase mock with a stateful mock in this test file so the session upsert payload can be inspected.

```ts
it("does not store raw IP addresses in session attribution", async () => {
  const sessionUpsert = vi.fn(() => ({
    select: () => ({
      single: async () => ({ data: { id: "00000000-0000-4000-8000-000000000001" }, error: null })
    })
  }));
  const visitorUpsert = vi.fn(() => ({
    select: () => ({
      single: async () => ({ data: { id: "00000000-0000-4000-8000-000000000002" }, error: null })
    })
  }));
  const insertEvents = vi.fn(async () => ({ error: null }));

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  vi.mocked(createSupabaseAdminClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "visitors") return { upsert: visitorUpsert };
      if (table === "sessions") return { upsert: sessionUpsert };
      if (table === "events") return { insert: insertEvents };
      if (table === "campaigns") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null })
                })
              })
            })
          })
        };
      }
      throw new Error(`Unexpected table ${table}`);
    })
  } as never);

  await POST(
    createEventRequest(
      { eventType: "page_view", path: "/" },
      {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-vercel-ip-country": "CN",
        "x-vercel-ip-country-region": "SN",
        "x-vercel-ip-city": "Xi'an"
      }
    )
  );

  expect(sessionUpsert).toHaveBeenCalledWith(
    expect.not.objectContaining({ ip_address: expect.anything() }),
    { onConflict: "id" }
  );
  expect(sessionUpsert.mock.calls[0][0]).toMatchObject({
    geo_country: "CN",
    geo_region: "SN",
    geo_city: "Xi'an"
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- src/app/api/events/route.test.ts
```

Expected: FAIL because `ip_address` is still present in the session upsert payload.

- [ ] **Step 3: Remove IP from event ingestion**

In `src/app/api/events/route.ts`, change the attribution type and session upsert:

```ts
type RequestAttribution = {
  campaignSlug: string | null;
  geoCity: string | null;
  geoCountry: string | null;
  geoRegion: string | null;
  referrer: string | null;
  sourceHint: string;
};
```

Update the session upsert object:

```ts
{
  id: job.sessionId,
  visitor_id: visitor.id,
  campaign_id: campaignId,
  referrer: job.attribution.referrer,
  geo_country: job.attribution.geoCountry,
  geo_region: job.attribution.geoRegion,
  geo_city: job.attribution.geoCity,
  source_hint: job.attribution.sourceHint
}
```

Update `getRequestAttribution`:

```ts
function getRequestAttribution(request: NextRequest, campaignSlug: string | null): RequestAttribution {
  const referrer = request.headers.get("referer");
  const geoCountry = request.headers.get("x-vercel-ip-country");
  const geoRegion = request.headers.get("x-vercel-ip-country-region");
  const geoCity = request.headers.get("x-vercel-ip-city");

  return {
    campaignSlug,
    geoCity,
    geoCountry,
    geoRegion,
    referrer,
    sourceHint: getSourceHint(campaignSlug, referrer)
  };
}
```

Delete `getIpAddress`.

- [ ] **Step 4: Update analytics types and UI to remove IP**

In `src/lib/data/analytics.ts`, remove `ipAddress` from `AnalyticsSession`, `RecentSessionSummary`, `toAnalyticsSession`, and Supabase selects.

Change the session select inside `getAnalyticsDashboard` from:

```ts
.select("id,visitor_id,campaign_id,referrer,ip_address,geo_country,geo_region,geo_city,source_hint,started_at,ended_at")
```

to:

```ts
.select("id,visitor_id,campaign_id,referrer,geo_country,geo_region,geo_city,source_hint,started_at,ended_at")
```

In `src/components/admin/analytics-dashboard.tsx`, delete the IP line:

```tsx
<span>{session.ipAddress ?? "IP 未记录"}</span>
```

- [ ] **Step 5: Create Supabase migration**

Run:

```bash
npx supabase migration new remove_session_ip_address
```

Open the generated migration and set its contents to:

```sql
alter table public.sessions
drop column if exists ip_address;
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm run test -- src/app/api/events/route.test.ts src/lib/data/analytics.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/events/route.ts src/app/api/events/route.test.ts src/lib/data/analytics.ts src/lib/data/analytics.test.ts src/components/admin/analytics-dashboard.tsx supabase/migrations
git commit -m "fix: stop storing raw visitor ip"
```

## Task 2: Preserve Campaign URLs And Fresh Public Data

**Files:**
- Modify: `src/app/v/[campaignSlug]/route.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/projects/[slug]/page.tsx`
- Modify: `src/lib/data/public.ts`
- Modify: `tests/e2e/events.spec.ts`
- Modify: `tests/e2e/public.spec.ts`

- [ ] **Step 1: Update failing e2e expectation for campaign links**

In `tests/e2e/events.spec.ts`, replace the campaign route test with:

```ts
test("campaign vanity route preserves URL and sets campaign cookie", async ({ context, page }) => {
  await page.goto("/v/sample-ai-pm");

  await expect.poll(() => new URL(page.url()).pathname).toBe("/v/sample-ai-pm");
  await expect(page.getByRole("heading", { name: /你好，我是/ })).toBeVisible();

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "portfolio_campaign")?.value).toBe("sample-ai-pm");
});
```

- [ ] **Step 2: Run e2e test to verify it fails**

Run:

```bash
npm run test:e2e -- tests/e2e/events.spec.ts --grep "campaign vanity route"
```

Expected: FAIL because current route redirects to `/`.

- [ ] **Step 3: Rewrite instead of redirect**

In `src/app/v/[campaignSlug]/route.ts`, change:

```ts
const response = NextResponse.redirect(new URL("/", request.url));
```

to:

```ts
const response = NextResponse.rewrite(new URL("/", request.url));
```

Keep the existing campaign cookie logic unchanged.

- [ ] **Step 4: Force public pages to read fresh data**

Add this export near the top of `src/app/page.tsx`:

```ts
export const dynamic = "force-dynamic";
```

Add this export near the top of `src/app/projects/[slug]/page.tsx`:

```ts
export const dynamic = "force-dynamic";
```

In `src/lib/data/public.ts`, keep fixture fallback only for local fixture mode or missing Supabase config. Replace broad `catch { return fixtureProfile; }` behavior with explicit helper:

```ts
function shouldUsePublicFixtures() {
  return (
    process.env.PORTFOLIO_USE_FIXTURES === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
```

Use it at the top of `getPublicProfile` and `getPublishedProjects`:

```ts
if (shouldUsePublicFixtures()) return fixtureProfile;
```

and:

```ts
if (shouldUsePublicFixtures()) return fixtureProjects;
```

If Supabase is configured and a query fails, throw the error instead of silently returning fixtures. This prevents production from looking like a demo when data loading is broken.

- [ ] **Step 5: Run focused public/e2e tests**

Run:

```bash
npm run test:e2e -- tests/e2e/events.spec.ts tests/e2e/public.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/v/[campaignSlug]/route.ts src/app/page.tsx src/app/projects/[slug]/page.tsx src/lib/data/public.ts tests/e2e/events.spec.ts tests/e2e/public.spec.ts
git commit -m "feat: preserve campaign portfolio urls"
```

## Task 3: Align Event Taxonomy And Aggregations

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/components/analytics/project-detail-tracker.tsx`
- Modify: `src/components/analytics/prd-read-tracker.tsx`
- Modify: `src/components/analytics/tracked-link.tsx`
- Modify: `src/lib/data/analytics.ts`
- Modify: `src/lib/data/analytics.test.ts`
- Modify: `tests/e2e/events.spec.ts`

- [ ] **Step 1: Add failing analytics aggregation tests for canonical events**

In `src/lib/data/analytics.test.ts`, add:

```ts
it("counts canonical project and PRD events while keeping legacy events compatible", () => {
  const events = [
    event("project_detail_open", { projectId: "project-a" }),
    event("project_detail_view", { projectId: "project-a" }),
    event("prd_open", { projectId: "project-a" }),
    event("prd_read", { projectId: "project-a" }),
    event("prd_full_view", { projectId: "project-a" }),
    event("project_dwell", { projectId: "project-a", durationMs: 9000 })
  ] satisfies AnalyticsEvent[];

  expect(summarizeProjectInterest(events)[0]).toMatchObject({
    projectId: "project-a",
    detailViews: 2,
    prdDeepReads: 3,
    averageDwellSeconds: 9
  });
});
```

Update the `event` helper type usage after `EVENT_TYPES` is expanded.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- src/lib/data/analytics.test.ts
```

Expected: FAIL because canonical event names are not in `EVENT_TYPES` and not counted.

- [ ] **Step 3: Extend event types**

In `src/lib/types.ts`, add canonical event names while preserving existing legacy names:

```ts
"project_detail_open",
"prd_open",
"prd_read",
"project_dwell",
```

Keep existing values such as `project_detail_view`, `prd_full_view`, `prd_section_view`, and `section_dwell` so old data and tests still work.

- [ ] **Step 4: Emit canonical events**

In `src/components/analytics/project-detail-tracker.tsx`, change:

```ts
eventType: "project_detail_view",
```

to:

```ts
eventType: "project_detail_open",
```

In `src/components/analytics/prd-read-tracker.tsx`, emit `prd_open` once when the tracker mounts:

```ts
trackEvent({
  eventType: "prd_open",
  projectId,
  metadata
});
```

Change the full-view sentinel event from:

```ts
eventType: "prd_full_view",
```

to:

```ts
eventType: "prd_read",
```

Keep `prd_section_view` for section-level ranking. Change dwell events from `section_dwell` to `project_dwell` only when the dwell belongs to a project-level PRD section:

```ts
trackEvent({
  eventType: "project_dwell",
  projectId,
  sectionId,
  durationMs,
  metadata
});
```

- [ ] **Step 5: Count both canonical and legacy events**

In `src/lib/data/analytics.ts`, add helpers:

```ts
function isProjectDetailEvent(eventType: EventType) {
  return eventType === "project_detail_open" || eventType === "project_detail_view";
}

function isPrdReadEvent(eventType: EventType) {
  return eventType === "prd_open" || eventType === "prd_read" || eventType === "prd_full_view" || eventType === "prd_section_view";
}

function isDwellEvent(eventType: EventType) {
  return eventType === "project_dwell" || eventType === "section_dwell";
}
```

Use them inside `summarizeProjectInterest`, `summarizeCampaignPerformance`, and `summarizeFunnel`.

For funnel, count canonical values into the existing labels:

```ts
if (eventType === "project_detail_open" || eventType === "project_detail_view") return "project_detail_view";
if (eventType === "prd_read" || eventType === "prd_full_view") return "prd_full_view";
```

- [ ] **Step 6: Update e2e expected captured events**

In `tests/e2e/events.spec.ts`, update the important event list:

```ts
["page_view", "project_impression", "demo_click", "project_detail_open"]
```

- [ ] **Step 7: Run tests**

```bash
npm run test -- src/lib/data/analytics.test.ts src/components/analytics/prd-read-tracker.test.tsx src/components/analytics/project-detail-tracker.test.tsx
npm run test:e2e -- tests/e2e/events.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/components/analytics src/lib/data/analytics.ts src/lib/data/analytics.test.ts tests/e2e/events.spec.ts
git commit -m "feat: align analytics event taxonomy"
```

## Task 4: Real Session Pagination And Detail Data

**Files:**
- Modify: `src/lib/data/analytics.ts`
- Modify: `src/lib/data/analytics.test.ts`
- Modify: `src/app/admin/analytics/page.tsx`
- Modify: `src/components/admin/analytics-dashboard.tsx`
- Create: `src/app/admin/analytics/sessions/[sessionId]/page.tsx`
- Create: `src/components/admin/session-detail.tsx`

- [ ] **Step 1: Add data types for paginated sessions and detail**

In `src/lib/data/analytics.ts`, add:

```ts
export type SessionListItem = {
  sessionId: string;
  visitorId: string;
  campaignLabel: string;
  campaignSlug: string | null;
  startedAt: string;
  lastEventAt: string | null;
  location: string;
  sourceHint: string | null;
  entryPath: string | null;
  eventCount: number;
  viewedProjects: string[];
  keyActions: string[];
};

export type PaginatedSessions = {
  items: SessionListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type SessionDetail = SessionListItem & {
  referrer: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  paths: string[];
  events: Array<{
    id: string;
    eventType: EventType;
    label: string;
    projectTitle: string | null;
    path: string;
    targetUrl: string | null;
    sectionId: string | null;
    durationMs: number | null;
    occurredAt: string;
  }>;
};
```

- [ ] **Step 2: Add failing tests for pagination and detail**

In `src/lib/data/analytics.test.ts`, import `summarizeSessionList` and `summarizeSessionDetail`, then add:

```ts
describe("session summaries", () => {
  it("paginates session list and summarizes key actions", () => {
    const sessions = [
      session("session-new", "campaign-a", "2026-06-11T12:00:00.000Z"),
      session("session-old", null, "2026-06-11T08:00:00.000Z")
    ] satisfies AnalyticsSession[];
    const campaigns = [{ id: "campaign-a", company: "Acme", role: "AI PM", tags: ["Agent"], slug: "acme-ai-pm" }] satisfies CampaignFact[];
    const projects = [{ id: "project-a", title: "Agent Demo", slug: "agent-demo" }] satisfies ProjectFact[];
    const events = [
      event("page_view", { sessionId: "session-new", campaignId: "campaign-a", path: "/v/acme-ai-pm" }),
      event("project_detail_open", { sessionId: "session-new", campaignId: "campaign-a", projectId: "project-a" }),
      event("demo_click", { sessionId: "session-new", campaignId: "campaign-a", projectId: "project-a" })
    ] satisfies AnalyticsEvent[];

    expect(summarizeSessionList(events, sessions, campaigns, projects, { page: 1, pageSize: 1 })).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
      items: [
        {
          sessionId: "session-new",
          campaignLabel: "Acme / AI PM",
          campaignSlug: "acme-ai-pm",
          entryPath: "/v/acme-ai-pm",
          eventCount: 3,
          viewedProjects: ["Agent Demo"],
          keyActions: ["进入项目详情", "点击 Demo"]
        }
      ]
    });
  });
});
```

- [ ] **Step 3: Implement pure summary helpers**

In `src/lib/data/analytics.ts`, implement:

```ts
export function summarizeSessionList(
  events: AnalyticsEvent[],
  sessions: AnalyticsSession[],
  campaigns: CampaignFact[],
  projects: ProjectFact[],
  options: { page: number; pageSize: number }
): PaginatedSessions {
  const safePageSize = Math.min(Math.max(options.pageSize, 1), 50);
  const safePage = Math.max(options.page, 1);
  const sorted = sessions.slice().sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const total = sorted.length;
  const totalPages = Math.max(Math.ceil(total / safePageSize), 1);
  const pageSessions = sorted.slice((safePage - 1) * safePageSize, safePage * safePageSize);

  return {
    items: pageSessions.map((item) => summarizeOneSession(item, events, campaigns, projects)),
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages
  };
}
```

Add `summarizeOneSession` to produce campaign label, entry path, event count, viewed projects, and key actions. Use `isProjectDetailEvent`, `isPrdReadEvent`, and demo click checks.

- [ ] **Step 4: Add database functions**

Add:

```ts
export async function getPaginatedSessions(options: { page: number; pageSize?: number }): Promise<PaginatedSessions> {
  const pageSize = options.pageSize ?? 12;
  const from = (Math.max(options.page, 1) - 1) * pageSize;
  const to = from + pageSize - 1;
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createSupabaseAdminClient();

  const [sessionsResult, eventsResult, campaignsResult, projectsResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id,visitor_id,campaign_id,referrer,geo_country,geo_region,geo_city,source_hint,started_at,ended_at", { count: "exact" })
      .order("started_at", { ascending: false })
      .range(from, to),
    supabase
      .from("events")
      .select("id,session_id,visitor_id,campaign_id,event_type,project_id,path,target_url,section_id,duration_ms,scroll_depth,metadata,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(1200),
    supabase.from("campaigns").select("id,company,role,tags,slug"),
    supabase.from("projects").select("id,title,slug")
  ]);

  if (sessionsResult.error) throw sessionsResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (campaignsResult.error) throw campaignsResult.error;
  if (projectsResult.error) throw projectsResult.error;

  const sessions = (sessionsResult.data ?? []).map(toAnalyticsSession);
  const events = (eventsResult.data ?? []).map(toAnalyticsEvent);
  const campaigns = (campaignsResult.data ?? []).map(toCampaignFact);
  const projects = (projectsResult.data ?? []).map(toProjectFact);
  const summarized = summarizeSessionList(events, sessions, campaigns, projects, { page: options.page, pageSize });

  return { ...summarized, total: sessionsResult.count ?? summarized.total, totalPages: Math.max(Math.ceil((sessionsResult.count ?? summarized.total) / pageSize), 1) };
}
```

Add `getSessionDetail(sessionId: string)` using targeted session and events queries.

- [ ] **Step 5: Update dashboard page and component**

In `src/app/admin/analytics/page.tsx`, parse `searchParams.page` and pass `sessions` separately:

```tsx
const page = Number((await searchParams)?.page ?? "1");
const [dashboard, sessions] = await Promise.all([
  getAnalyticsDashboard(),
  getPaginatedSessions({ page, pageSize: 12 })
]);
```

Change `AnalyticsDashboard` props to:

```ts
{
  data: AnalyticsDashboardData;
  sessions: PaginatedSessions;
  errorMessage?: string;
}
```

Replace the expanded session articles with a table linking to `/admin/analytics/sessions/${session.sessionId}`.

- [ ] **Step 6: Create session detail route**

Create `src/app/admin/analytics/sessions/[sessionId]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionDetailView } from "@/components/admin/session-detail";
import { requireAdmin } from "@/lib/auth/admin";
import { getSessionDetail } from "@/lib/data/analytics";

export const dynamic = "force-dynamic";

export default async function AdminSessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  await requireAdmin();
  const { sessionId } = await params;
  const detail = await getSessionDetail(sessionId);
  if (!detail) notFound();

  return (
    <div className="admin-stack">
      <Link className="back-link" href="/admin/analytics">
        返回数据驾驶舱
      </Link>
      <SessionDetailView detail={detail} />
    </div>
  );
}
```

Create `src/components/admin/session-detail.tsx` with a header, metadata grid, path chips, and chronological timeline. Use `detail.events.map`.

- [ ] **Step 7: Run tests**

```bash
npm run test -- src/lib/data/analytics.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/data/analytics.ts src/lib/data/analytics.test.ts src/app/admin/analytics src/components/admin/analytics-dashboard.tsx src/components/admin/session-detail.tsx
git commit -m "feat: add paginated analytics sessions"
```

## Task 5: Full Admin Project CRUD

**Files:**
- Modify: `src/app/admin/projects/page.tsx`
- Create: `src/components/admin/project-delete-button.tsx`
- Modify: `src/app/api/admin/projects/[id]/route.ts`
- Modify: `src/lib/data/admin.test.ts`
- Modify: `src/lib/data/admin.ts`

- [ ] **Step 1: Add data-layer tests for project update/delete**

In `src/lib/data/admin.test.ts`, add tests that mock `from("projects").update(...).eq(...).select(...).single()` and `from("projects").delete().eq(...)`.

Use this expected update payload:

```ts
expect(update).toHaveBeenCalledWith(
  expect.objectContaining({
    title: "Updated project",
    slug: "updated-project",
    status: "published",
    is_featured: true,
    sort_order: 3
  })
);
```

- [ ] **Step 2: Run test to verify current data layer behavior**

```bash
npm run test -- src/lib/data/admin.test.ts
```

Expected: PASS if existing `upsertProject(input, id)` and `deleteProject` are already sufficient. If mocks reveal a missing chain, fix the mock rather than the production data layer.

- [ ] **Step 3: Add shared revalidation helper**

In `src/app/admin/projects/page.tsx`, add:

```ts
function revalidateProjectSurfaces(projectSlug?: string) {
  revalidatePath("/");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/analytics");
  if (projectSlug) {
    revalidatePath(`/projects/${projectSlug}`);
  }
}
```

- [ ] **Step 4: Add update and delete server actions**

In `src/app/admin/projects/page.tsx`, add:

```ts
async function updateProjectAction(formData: FormData) {
  "use server";

  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  let message = "updated";

  try {
    const project = await parseAdminProjectFormData(formData);
    const updated = await upsertProject(project, id);
    revalidateProjectSurfaces(updated.slug);
  } catch (error) {
    message = isAdminProjectInputError(error) ? "invalid-input" : "save-failed";
  }

  redirect(`/admin/projects?message=${message}`);
}

async function deleteProjectAction(formData: FormData) {
  "use server";

  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");

  try {
    await deleteProject(id);
    revalidateProjectSurfaces(slug);
    redirect("/admin/projects?message=deleted");
  } catch {
    redirect("/admin/projects?message=delete-failed");
  }
}
```

Import `deleteProject`.

- [ ] **Step 5: Add delete confirmation client component**

Create `src/components/admin/project-delete-button.tsx`:

```tsx
"use client";

export function ProjectDeleteButton({ projectTitle }: { projectTitle: string }) {
  return (
    <button
      className="admin-button admin-button--danger"
      formAction=""
      type="submit"
      onClick={(event) => {
        if (!window.confirm(`确认删除「${projectTitle}」吗？历史访问事件会保留为已删除项目。`)) {
          event.preventDefault();
        }
      }}
    >
      删除项目
    </button>
  );
}
```

Use it inside a form whose `action={deleteProjectAction}`.

- [ ] **Step 6: Replace project table with editable rows**

In `ProjectRow`, render a `<details>` editor per project. The form must include every editable field with current defaults:

```tsx
<form action={updateProjectAction} className="admin-form admin-form--compact" encType="multipart/form-data">
  <input name="id" type="hidden" value={project.id} />
  <input name="title" defaultValue={project.title} required />
  <input name="slug" defaultValue={project.slug} pattern="[a-z0-9-]+" required />
  <textarea name="summary" defaultValue={project.summary} required rows={3} />
  <input name="tags" defaultValue={project.tags.join(",")} />
  <input name="demoUrl" defaultValue={project.demoUrl} required type="url" />
  <input name="coverImageUrl" defaultValue={project.coverImageUrl ?? ""} />
  <input name="sortOrder" defaultValue={project.sortOrder} type="number" />
  <select name="status" defaultValue={project.status}>
    <option value="draft">草稿</option>
    <option value="published">已发布</option>
    <option value="hidden">隐藏</option>
  </select>
  <textarea name="contribution" defaultValue={project.contribution} rows={3} />
  <textarea name="aiUsage" defaultValue={project.aiUsage} rows={3} />
  <textarea name="decisions" defaultValue={project.decisions} rows={3} />
  <textarea name="reflection" defaultValue={project.reflection} rows={3} />
  <textarea className="admin-form__mono" name="prdMarkdown" defaultValue={project.prdMarkdown} rows={10} />
  <label><input name="isFeatured" type="checkbox" defaultChecked={project.isFeatured} /> 首页精选</label>
  <label><input name="analyticsEnabled" type="checkbox" defaultChecked={project.analyticsEnabled} /> 记录项目交互数据</label>
  <button className="admin-button" type="submit">保存修改</button>
</form>
```

Add a separate delete form:

```tsx
<form action={deleteProjectAction}>
  <input name="id" type="hidden" value={project.id} />
  <input name="slug" type="hidden" value={project.slug} />
  <ProjectDeleteButton projectTitle={project.title} />
</form>
```

- [ ] **Step 7: Revalidate API PUT/DELETE**

In `src/app/api/admin/projects/[id]/route.ts`, import `revalidatePath` and call:

```ts
revalidatePath("/");
revalidatePath("/admin/projects");
revalidatePath("/admin/analytics");
revalidatePath(`/projects/${project.slug}`);
```

after PUT. After DELETE, revalidate `/`, `/admin/projects`, and `/admin/analytics`.

- [ ] **Step 8: Add status messages**

In `getStatusMessage`, add:

```ts
if (value === "updated") return { message: "项目已更新。", tone: "success" as const };
if (value === "deleted") return { message: "项目已删除，历史事件已保留。", tone: "success" as const };
if (value === "delete-failed") return { message: "删除失败，请稍后重试。", tone: "error" as const };
```

- [ ] **Step 9: Run focused checks**

```bash
npm run test -- src/lib/data/admin.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/app/admin/projects/page.tsx src/components/admin/project-delete-button.tsx src/app/api/admin/projects/[id]/route.ts src/lib/data/admin.ts src/lib/data/admin.test.ts
git commit -m "feat: add admin project editing"
```

## Task 6: Remove Seeded Mock Projects And Add Cleanup Script

**Files:**
- Modify: `supabase/seed.sql`
- Create: `scripts/backup-and-delete-mock-projects.mjs`
- Modify: `.gitignore` only if a backup folder is not already ignored

- [ ] **Step 1: Remove mock project inserts from seed**

In `supabase/seed.sql`, delete the `insert into public.projects (...) values (...)` block for:

- `11111111-1111-4111-8111-111111111111`
- `22222222-2222-4222-8222-222222222222`

Keep the profile and sample campaign seed.

- [ ] **Step 2: Create production cleanup script**

Create `scripts/backup-and-delete-mock-projects.mjs`:

```js
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const MOCK_PROJECT_IDS = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222"
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false }
});

const { data, error } = await supabase.from("projects").select("*").in("id", MOCK_PROJECT_IDS);
if (error) throw error;

const backupDir = resolve(".superpowers/backups");
await mkdir(backupDir, { recursive: true });
const exportedAt = new Date().toISOString().replaceAll(":", "-");
const backupPath = resolve(backupDir, `mock-projects-before-delete-${exportedAt}.json`);
await writeFile(backupPath, JSON.stringify({ exportedAt, projects: data ?? [] }, null, 2));

const { error: deleteError } = await supabase.from("projects").delete().in("id", MOCK_PROJECT_IDS);
if (deleteError) throw deleteError;

console.log(`Backed up ${data?.length ?? 0} mock projects to ${backupPath}`);
console.log("Deleted known mock projects from Supabase.");
```

- [ ] **Step 3: Run local syntax check**

```bash
node --check scripts/backup-and-delete-mock-projects.mjs
```

Expected: no output and exit code 0.

- [ ] **Step 4: Do not run production cleanup until after code deploy is verified**

When implementation is complete and env vars are present locally, run:

```bash
node scripts/backup-and-delete-mock-projects.mjs
```

Expected: prints backup file path and deletion confirmation.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql scripts/backup-and-delete-mock-projects.mjs
git commit -m "chore: remove seeded portfolio mock projects"
```

## Task 7: Public Resume Evidence And Project Experience Layout

**Files:**
- Create: `src/components/public/resume-evidence.tsx`
- Modify: `src/components/public/project-grid.tsx`
- Modify: `src/components/public/project-card.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/public/project-card.test.tsx`
- Modify: `tests/e2e/public.spec.ts`

- [ ] **Step 1: Add public rendering tests for renamed section**

In `tests/e2e/public.spec.ts`, update expectations:

```ts
await expect(page.getByRole("heading", { name: "项目经历" })).toBeVisible();
await expect(page.getByRole("heading", { name: "轻量经历摘要" })).toBeVisible();
await expect(page.getByText("项目证据")).toHaveCount(0);
```

- [ ] **Step 2: Create resume evidence component**

Create `src/components/public/resume-evidence.tsx`:

```tsx
import type { Profile } from "@/lib/types";

const BLOCKS = [
  { title: "教育背景", keywords: ["西安交通大学", "硕士", "研二"], fallback: "西安交通大学网安硕士，具备技术理解和产品表达的双重基础。" },
  { title: "实习经历", keywords: ["实习", "SenseCore", "工作流"], fallback: "参与 AI 工作流转型，把真实业务需求转成可讨论材料。" },
  { title: "AI 产品能力", keywords: ["场景", "问题", "边界", "AI"], fallback: "关注真实场景、关键问题和 AI 能力边界。" },
  { title: "原型与 PRD 证据", keywords: ["Demo", "PRD", "原型"], fallback: "沉淀可预览 Demo、PRD 和项目复盘。" },
  { title: "协作探索", keywords: ["协作", "Agent", "研发"], fallback: "探索产品、研发与 Agent 协作的新方式。" }
] as const;

export function ResumeEvidence({ profile }: { profile: Profile }) {
  return (
    <section className="resume-evidence" aria-labelledby="resume-title">
      <div className="section-heading">
        <p>Resume Notes</p>
        <h2 id="resume-title">轻量经历摘要</h2>
      </div>
      <div className="resume-evidence__grid">
        {BLOCKS.map((block) => (
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
```

- [ ] **Step 3: Replace resume snapshot list on homepage**

In `src/app/page.tsx`, import `ResumeEvidence` and replace the old `<section className="resume-snapshot">...</section>` with:

```tsx
<ResumeEvidence profile={profile} />
```

- [ ] **Step 4: Convert project grid to timeline/index**

In `src/components/public/project-grid.tsx`, rename copy and class names:

```tsx
export function ProjectGrid({ projects }: { projects: Project[] }) {
  const publishedProjects = projects.filter((project) => project.status === "published");

  return (
    <section className="project-section" aria-labelledby="projects-title">
      <div className="section-heading">
        <p>Project Experience</p>
        <h2 id="projects-title">项目经历</h2>
        <span>按项目顺序快速扫读场景、角色、AI 使用方式和关键判断；精选项目仍在上方负责第一眼吸引。</span>
      </div>

      <div className="project-experience-list">
        {publishedProjects.map((project, index) => (
          <ProjectCard index={index} key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}
```

Update `ProjectCard` props:

```tsx
export function ProjectCard({ index, project }: { index: number; project: Project }) {
```

Render timeline content with the same tracking wrapper:

```tsx
<ProjectImpression className="project-experience" projectId={project.id} projectSlug={project.slug} projectTitle={project.title}>
  <div className="project-experience__index">{String(index + 1).padStart(2, "0")}</div>
  <div className="project-experience__main">
    <div className="tag-row">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    <h3>{project.title}</h3>
    <p>{project.summary}</p>
    <dl className="project-experience__facts">
      <div><dt>我的角色</dt><dd>{project.contribution}</dd></div>
      <div><dt>AI 使用方式</dt><dd>{project.aiUsage}</dd></div>
      <div><dt>关键判断</dt><dd>{project.decisions}</dd></div>
      <div><dt>项目思考</dt><dd>{project.reflection}</dd></div>
    </dl>
  </div>
  <div className="project-experience__actions">
    <Link className="button-link button-link--primary" href={`/projects/${project.slug}`}>阅读详情</Link>
    <TrackedLink className="button-link" eventType="demo_click" href={project.demoUrl} metadata={{ projectSlug: project.slug, projectTitle: project.title }} projectId={project.id} rel="noreferrer" target="_blank" targetUrl={project.demoUrl}>查看 Demo</TrackedLink>
  </div>
</ProjectImpression>
```

- [ ] **Step 5: Add CSS**

In `src/app/globals.css`, add:

```css
.resume-evidence {
  margin-top: 64px;
  border-top: 1px solid var(--line);
  padding-top: 28px;
}

.resume-evidence__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--line);
  background: var(--line);
}

.resume-evidence__item {
  min-width: 0;
  background: var(--surface);
  padding: 18px;
}

.resume-evidence__item span {
  display: block;
  color: var(--accent);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  margin-bottom: 10px;
}

.resume-evidence__item strong {
  display: block;
  font-size: 1rem;
  line-height: 1.55;
}

.project-experience-list {
  display: grid;
  gap: 14px;
}

.project-experience {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) minmax(170px, auto);
  gap: 18px;
  align-items: start;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 18px;
}

.project-experience__index {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--line);
  color: var(--accent);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-weight: 800;
}

.project-experience__main h3 {
  margin: 14px 0 10px;
  font-size: clamp(1.25rem, 2vw, 1.7rem);
}

.project-experience__main p {
  color: var(--muted);
  line-height: 1.7;
  margin: 0;
}

.project-experience__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0 0;
}

.project-experience__facts div {
  border-top: 1px solid rgba(36, 26, 18, 0.25);
  padding-top: 10px;
}

.project-experience__facts dt {
  font-weight: 800;
  margin-bottom: 5px;
}

.project-experience__facts dd {
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.project-experience__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
```

Add responsive rules in the existing media section:

```css
@media (max-width: 860px) {
  .resume-evidence__grid {
    grid-template-columns: 1fr;
  }

  .project-experience {
    grid-template-columns: 1fr;
  }

  .project-experience__actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .project-experience__facts {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npm run test -- src/components/public/project-card.test.tsx
npm run test:e2e -- tests/e2e/public.spec.ts
```

Expected: PASS after updating component tests to query `.project-experience` instead of `.project-card`.

- [ ] **Step 7: Commit**

```bash
git add src/components/public src/app/page.tsx src/app/globals.css tests/e2e/public.spec.ts
git commit -m "feat: redesign public project experience"
```

## Task 8: Analytics Dashboard Empty States And Backup Summary

**Files:**
- Modify: `src/components/admin/analytics-dashboard.tsx`
- Modify: `src/app/admin/analytics/page.tsx`
- Modify: `src/app/api/admin/backups/route.ts`
- Modify: `src/app/api/admin/backups/route.test.ts`

- [ ] **Step 1: Make empty states specific**

In `src/components/admin/analytics-dashboard.tsx`, use these labels:

```tsx
{data.projectInterest.length === 0 ? <EmptyRow colSpan={6} label="暂无项目详情访问。等有访客进入项目、阅读 PRD 或点击 Demo 后，这里会显示真实兴趣排序。" /> : null}
{data.campaignSummary.campaigns.length === 0 ? <EmptyRow colSpan={5} label="暂无投递链接访问。创建专属链接并被打开后，这里会显示公司/岗位对比。" /> : null}
{data.campaignSummary.tagPreferences.length === 0 ? <EmptyState label="暂无 JD 标签偏好。带标签的投递链接产生访问后，这里会出现真实统计。" /> : null}
{data.prdSectionInterest.length === 0 ? <EmptyRow colSpan={3} label="暂无 PRD 阅读事件。访客打开并阅读 PRD 后，这里会显示小节兴趣。" /> : null}
```

- [ ] **Step 2: Add data volume summary**

In `src/lib/data/analytics.ts`, add:

```ts
export type DataVolumeSummary = {
  projects: number;
  campaigns: number;
  sessions: number;
  events: number;
};
```

Add `dataVolume` to `AnalyticsDashboardData` and populate it in `getAnalyticsDashboard`.

In the dashboard header, add four compact metrics:

```tsx
<Metric label="项目数据" value={data.dataVolume.projects} />
<Metric label="投递链接" value={data.dataVolume.campaigns} />
<Metric label="会话记录" value={data.dataVolume.sessions} />
<Metric label="事件记录" value={data.dataVolume.events} />
```

- [ ] **Step 3: Add analytics summary to backup**

In `src/app/api/admin/backups/route.ts`, import:

```ts
import { getAnalyticsDashboard } from "@/lib/data/analytics";
```

Then include:

```ts
const analyticsSummary = await getAnalyticsDashboard();
```

and return:

```ts
{
  exportedAt,
  analyticsSummary,
  ...Object.fromEntries(entries)
}
```

Because raw IP has been removed, no backup route should emit `ip_address`.

- [ ] **Step 4: Update backup route test**

In `src/app/api/admin/backups/route.test.ts`, assert:

```ts
expect(body.analyticsSummary).toBeDefined();
expect(JSON.stringify(body)).not.toContain("ip_address");
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- src/app/api/admin/backups/route.test.ts src/lib/data/analytics.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/analytics-dashboard.tsx src/app/admin/analytics/page.tsx src/app/api/admin/backups/route.ts src/app/api/admin/backups/route.test.ts src/lib/data/analytics.ts src/lib/data/analytics.test.ts
git commit -m "feat: improve analytics empty states and backups"
```

## Task 9: End-To-End Verification And Production Cleanup

**Files:**
- No planned source edits unless verification finds a defect.

- [ ] **Step 1: Run full local verification**

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run e2e smoke tests**

```bash
npm run test:e2e -- tests/e2e/public.spec.ts tests/e2e/events.spec.ts tests/e2e/admin-auth.spec.ts
```

Expected: all pass. If Playwright browsers are missing, run:

```bash
npx playwright install chromium
```

then rerun the same command.

- [ ] **Step 3: Apply Supabase migration**

Use the existing Supabase deployment workflow. If the project is linked locally, run:

```bash
npx supabase db push
```

Expected: migration removing `sessions.ip_address` applies successfully.

- [ ] **Step 4: Deploy to Vercel**

Push `main` after commits, or run the existing Vercel deployment flow. Verify these routes in production:

```text
/
/v/sample-ai-pm
/login
/admin/projects
/admin/analytics
/admin/analytics/sessions/<real-session-id>
```

Expected:

- `/v/sample-ai-pm` stays in the address bar.
- Public page shows latest Supabase-backed profile and project data.
- Admin project page supports edit/delete.
- Analytics dashboard shows empty states or real data, never mock counts.

- [ ] **Step 5: Run production mock cleanup**

After deployment is healthy and local env vars point to production Supabase, run:

```bash
node scripts/backup-and-delete-mock-projects.mjs
```

Expected: script prints a backup file path under `.superpowers/backups` and deletes the two known mock projects.

- [ ] **Step 6: Generate one real analytics flow**

Open production `/v/sample-ai-pm`, view the project section, open a project detail, open/read PRD, and click a Demo link. Then check `/admin/analytics`.

Expected:

- Campaign session appears under `sample-ai-pm`.
- Project interest increments with real counts.
- Session list shows the new visit.
- Session detail timeline shows page view, project impression, detail open, PRD events, and demo click.

- [ ] **Step 7: Final commit if verification required fixes**

If verification caused code changes:

```bash
git add <changed-files>
git commit -m "fix: stabilize portfolio redesign verification"
```

If no changes were needed, do not create an empty commit.

## Self-Review Checklist

- Spec coverage: public page freshness, campaign URL preservation, project CRUD, mock cleanup, real analytics, session pagination/detail, no raw IP, backup export, and Vercel/Supabase limit mitigations are covered.
- Placeholder scan: no unresolved placeholder markers or open-ended implementation instructions are present.
- Type consistency: canonical event names are added to `EVENT_TYPES` before tracker and analytics code uses them.
- Risk note: production DB cleanup is intentionally delayed until after deployment verification and creates a local backup first.
