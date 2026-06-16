import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPaginatedSessions,
  getAnalyticsDashboard,
  summarizeCampaignPerformance,
  summarizeFunnel,
  summarizeProjectInterest,
  summarizeRecentSessions,
  summarizeSessionDetail,
  summarizeSessionList,
  type AnalyticsEvent,
  type AnalyticsSession,
  type CampaignFact,
  type ProjectFact
} from "./analytics";

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: supabaseMocks.createSupabaseAdminClient
}));

beforeEach(() => {
  supabaseMocks.createSupabaseAdminClient.mockReset();
});

describe("summarizeProjectInterest", () => {
  it("counts project behavior and averages dwell time in seconds", () => {
    const events = [
      event("project_impression", { projectId: "project-a" }),
      event("project_impression", { projectId: "project-a" }),
      event("project_expand", { projectId: "project-a" }),
      event("project_detail_view", { projectId: "project-a" }),
      event("prd_full_view", { projectId: "project-a" }),
      event("prd_section_view", { projectId: "project-a" }),
      event("section_dwell", { projectId: "project-a", durationMs: 12_000 }),
      event("section_dwell", { projectId: "project-a", durationMs: 18_000 }),
      event("demo_click", { projectId: "project-a" }),
      event("external_link_click", { projectId: "project-a" }),
      event("project_impression", { projectId: "project-b" }),
      event("section_dwell", { projectId: "project-b", durationMs: 4_500 })
    ] satisfies AnalyticsEvent[];

    expect(summarizeProjectInterest(events)).toEqual([
      {
        projectId: "project-a",
        title: "project-a",
        slug: null,
        impressions: 2,
        detailViews: 1,
        prdDeepReads: 2,
        demoClicks: 2,
        averageDwellSeconds: 15
      },
      {
        projectId: "project-b",
        title: "project-b",
        slug: null,
        impressions: 1,
        detailViews: 0,
        prdDeepReads: 0,
        demoClicks: 0,
        averageDwellSeconds: 4.5
      }
    ]);
  });

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

  it("ignores legacy project_expand events without crashing", () => {
    const events = [
      event("project_expand", { projectId: "project-a" }),
      event("project_expand", { projectId: "project-a" }),
      event("project_detail_view", { projectId: "project-a" })
    ] satisfies AnalyticsEvent[];

    expect(summarizeProjectInterest(events)).toEqual([
      {
        projectId: "project-a",
        title: "project-a",
        slug: null,
        impressions: 0,
        detailViews: 1,
        prdDeepReads: 0,
        demoClicks: 0,
        averageDwellSeconds: 0
      }
    ]);
  });

  it("sorts by detailViews, then demoClicks, then prdDeepReads, then impressions", () => {
    const events = [
      event("project_detail_view", { projectId: "project-a" }),
      event("demo_click", { projectId: "project-a" }),
      event("project_detail_view", { projectId: "project-b" }),
      event("project_detail_view", { projectId: "project-b" }),
      event("project_impression", { projectId: "project-c" })
    ] satisfies AnalyticsEvent[];

    expect(summarizeProjectInterest(events).map((p) => p.projectId)).toEqual(["project-b", "project-a", "project-c"]);
  });

  it("uses project titles and slugs when provided", () => {
    const events = [event("project_detail_view", { projectId: "project-a" })] satisfies AnalyticsEvent[];

    expect(
      summarizeProjectInterest(events, [{ id: "project-a", title: "AI 面试复盘系统", slug: "ai-interview-retro" }])[0]
    ).toMatchObject({
      projectId: "project-a",
      title: "AI 面试复盘系统",
      slug: "ai-interview-retro"
    });
  });
});

describe("summarizeFunnel", () => {
  it("counts unique sessions through the reading funnel", () => {
    const events = [
      event("page_view", { sessionId: "session-1" }),
      event("project_impression", { sessionId: "session-1", projectId: "project-a" }),
      event("project_expand", { sessionId: "session-1", projectId: "project-a" }),
      event("project_detail_view", { sessionId: "session-1", projectId: "project-a" }),
      event("prd_full_view", { sessionId: "session-1", projectId: "project-a" }),
      event("demo_click", { sessionId: "session-1", projectId: "project-a" }),
      event("page_view", { sessionId: "session-2" }),
      event("project_impression", { sessionId: "session-2", projectId: "project-b" }),
      event("project_expand", { sessionId: "session-2", projectId: "project-b" })
    ] satisfies AnalyticsEvent[];

    expect(summarizeFunnel(events)).toEqual([
      { key: "page_view", label: "访问页面", sessions: 2 },
      { key: "project_impression", label: "看到项目", sessions: 2 },
      { key: "project_detail_view", label: "进入详情", sessions: 1 },
      { key: "prd_full_view", label: "阅读 PRD", sessions: 1 },
      { key: "demo_click", label: "点击 Demo/外链", sessions: 1 }
    ]);
  });
});

describe("summarizeCampaignPerformance", () => {
  it("aggregates factual campaign activity and JD tag interest", () => {
    const campaigns = [
      { id: "campaign-a", company: "Acme", role: "AI PM", tags: ["Agent", "B2B"], slug: "acme-ai-pm" },
      { id: "campaign-b", company: "Beta", role: "Growth PM", tags: ["Growth"], slug: "beta-growth" }
    ] satisfies CampaignFact[];
    const sessions = [
      session("session-1", "campaign-a", "2026-06-11T10:00:00.000Z"),
      session("session-2", "campaign-a", "2026-06-11T11:00:00.000Z"),
      session("session-3", "campaign-b", "2026-06-11T12:00:00.000Z")
    ] satisfies AnalyticsSession[];
    const events = [
      event("project_detail_view", { sessionId: "session-1", campaignId: "campaign-a", projectId: "project-a" }),
      event("demo_click", { sessionId: "session-1", campaignId: "campaign-a", projectId: "project-a" }),
      event("project_detail_view", { sessionId: "session-2", campaignId: "campaign-a", projectId: "project-b" }),
      event("project_expand", { sessionId: "session-3", campaignId: "campaign-b", projectId: "project-a" })
    ] satisfies AnalyticsEvent[];

    expect(summarizeCampaignPerformance(events, sessions, campaigns)).toEqual({
      campaigns: [
        {
          campaignId: "campaign-a",
          company: "Acme",
          role: "AI PM",
          slug: "acme-ai-pm",
          tags: ["Agent", "B2B"],
          sessions: 2,
          projectDetailViews: 2,
          demoClicks: 1,
          lastSeenAt: "2026-06-11T11:00:00.000Z"
        },
        {
          campaignId: "campaign-b",
          company: "Beta",
          role: "Growth PM",
          slug: "beta-growth",
          tags: ["Growth"],
          sessions: 1,
          projectDetailViews: 0,
          demoClicks: 0,
          lastSeenAt: "2026-06-11T12:00:00.000Z"
        }
      ],
      tagPreferences: [
        { tag: "Agent", sessions: 2, projectDetailViews: 2, demoClicks: 1 },
        { tag: "B2B", sessions: 2, projectDetailViews: 2, demoClicks: 1 },
        { tag: "Growth", sessions: 1, projectDetailViews: 0, demoClicks: 0 }
      ]
    });
  });
});

describe("summarizeRecentSessions", () => {
  it("does not surface legacy project expand events in the displayed session path", () => {
    const sessions = [session("session-1", null, "2026-06-11T10:00:00.000Z")] satisfies AnalyticsSession[];
    const campaigns = [] satisfies CampaignFact[];
    const projects = [{ id: "project-a", title: "Agent Demo", slug: "agent-demo" }] satisfies ProjectFact[];
    const events = [
      event("project_expand", {
        occurredAt: "2026-06-11T10:01:00.000Z",
        projectId: "project-a",
        sessionId: "session-1"
      }),
      event("project_detail_view", {
        occurredAt: "2026-06-11T10:02:00.000Z",
        projectId: "project-a",
        sessionId: "session-1"
      })
    ] satisfies AnalyticsEvent[];

    expect(summarizeRecentSessions(events, sessions, campaigns, projects)[0].events).toEqual([
      {
        eventType: "project_detail_view",
        projectTitle: "Agent Demo",
        path: "/",
        targetUrl: null,
        occurredAt: "2026-06-11T10:02:00.000Z"
      }
    ]);
  });

  it("returns sessions ordered by startedAt descending", () => {
    const sessions = [
      session("session-old", null, "2026-06-11T08:00:00.000Z"),
      session("session-new", null, "2026-06-11T12:00:00.000Z"),
      session("session-mid", null, "2026-06-11T10:00:00.000Z")
    ] satisfies AnalyticsSession[];

    expect(summarizeRecentSessions([], sessions, [], []).map((s) => s.sessionId)).toEqual([
      "session-new",
      "session-mid",
      "session-old"
    ]);
  });
});

describe("session summaries", () => {
  it("paginates session list and summarizes key actions", () => {
    const sessions = [
      session("session-new", "campaign-a", "2026-06-11T12:00:00.000Z"),
      session("session-old", null, "2026-06-11T08:00:00.000Z")
    ] satisfies AnalyticsSession[];
    const campaigns = [
      { id: "campaign-a", company: "Acme", role: "AI PM", tags: ["Agent"], slug: "acme-ai-pm" }
    ] satisfies CampaignFact[];
    const projects = [{ id: "project-a", title: "Agent Demo", slug: "agent-demo" }] satisfies ProjectFact[];
    const events = [
      event("page_view", {
        id: "event-1",
        sessionId: "session-new",
        campaignId: "campaign-a",
        path: "/v/acme-ai-pm",
        occurredAt: "2026-06-11T12:00:01.000Z"
      }),
      event("project_detail_open", {
        id: "event-2",
        sessionId: "session-new",
        campaignId: "campaign-a",
        projectId: "project-a",
        occurredAt: "2026-06-11T12:00:02.000Z"
      }),
      event("demo_click", {
        id: "event-3",
        sessionId: "session-new",
        campaignId: "campaign-a",
        projectId: "project-a",
        occurredAt: "2026-06-11T12:00:03.000Z"
      })
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

  it("does not drop database-paginated sessions when requesting later pages", async () => {
    supabaseMocks.createSupabaseAdminClient.mockReturnValue(
      createPaginatedSessionsClient({
        count: 24,
        events: [
          event("page_view", {
            id: "event-page-2",
            sessionId: "session-page-2",
            path: "/v/acme-ai-pm",
            occurredAt: "2026-06-11T12:00:01.000Z"
          })
        ],
        sessions: [session("session-page-2", null, "2026-06-11T12:00:00.000Z")]
      }) as never
    );

    const result = await getPaginatedSessions({ page: 2, pageSize: 12 });

    expect(result).toMatchObject({
      page: 2,
      pageSize: 12,
      total: 24,
      totalPages: 2,
      items: [
        {
          sessionId: "session-page-2",
          entryPath: "/v/acme-ai-pm",
          eventCount: 1
        }
      ]
    });
  });

  it("summarizes session detail with ordered events, unique paths, and duration", () => {
    const detailSession = {
      ...session("session-detail", null, "2026-06-11T12:00:00.000Z"),
      endedAt: null,
      referrer: "https://example.com/jobs",
      sourceHint: "linkedin"
    } satisfies AnalyticsSession;
    const projects = [{ id: "project-a", title: "Agent Demo", slug: "agent-demo" }] satisfies ProjectFact[];
    const events = [
      event("demo_click", {
        id: "event-late",
        sessionId: "session-detail",
        projectId: "project-a",
        path: "/projects/agent-demo",
        targetUrl: "https://demo.example.com",
        occurredAt: "2026-06-11T12:04:00.000Z"
      }),
      event("page_view", {
        id: "event-early",
        sessionId: "session-detail",
        path: "/",
        occurredAt: "2026-06-11T12:01:00.000Z"
      }),
      event("prd_read", {
        id: "event-mid",
        sessionId: "session-detail",
        projectId: "missing-project",
        path: "/projects/agent-demo",
        sectionId: "problem",
        durationMs: 30_000,
        occurredAt: "2026-06-11T12:03:00.000Z"
      })
    ] satisfies AnalyticsEvent[];

    expect(summarizeSessionDetail(detailSession, events, [], projects)).toMatchObject({
      sessionId: "session-detail",
      campaignLabel: "直接访问",
      campaignSlug: null,
      referrer: "https://example.com/jobs",
      sourceHint: "linkedin",
      entryPath: "/",
      lastEventAt: "2026-06-11T12:04:00.000Z",
      durationSeconds: 240,
      paths: ["/", "/projects/agent-demo"],
      viewedProjects: ["已删除项目", "Agent Demo"],
      keyActions: ["阅读 PRD", "点击 Demo"],
      events: [
        {
          id: "event-early",
          eventType: "page_view",
          label: "页面",
          path: "/",
          projectTitle: null
        },
        {
          id: "event-mid",
          eventType: "prd_read",
          label: "PRD 阅读",
          path: "/projects/agent-demo",
          projectTitle: "已删除项目",
          sectionId: "problem",
          durationMs: 30000
        },
        {
          id: "event-late",
          eventType: "demo_click",
          label: "Demo",
          path: "/projects/agent-demo",
          projectTitle: "Agent Demo",
          targetUrl: "https://demo.example.com"
        }
      ]
    });
  });
});

describe("getAnalyticsDashboard", () => {
  it("uses exact Supabase counts for data volume", async () => {
    supabaseMocks.createSupabaseAdminClient.mockReturnValue(
      createDashboardClient({
        campaigns: [{ id: "campaign-a", company: "Acme", role: "AI PM", tags: ["Agent"], slug: "acme-ai-pm" }],
        campaignCount: 3,
        events: [event("page_view"), event("demo_click")],
        eventCount: 1250,
        projects: [{ id: "project-a", title: "Agent Demo", slug: "agent-demo" }],
        projectCount: 5,
        sessions: [session("session-1", "campaign-a", "2026-06-11T10:00:00.000Z")],
        sessionCount: 301
      }) as never
    );

    const data = await getAnalyticsDashboard();

    expect(data.dataVolume).toEqual({
      campaigns: 3,
      events: 1250,
      projects: 5,
      sessions: 301
    });
    expect(data.kpis.totalEvents).toBe(1250);
    expect(data.kpis.totalSessions).toBe(301);
  });
});

function event(
  eventType: AnalyticsEvent["eventType"],
  overrides: Partial<AnalyticsEvent> = {}
): AnalyticsEvent {
  return {
    id: `${eventType}-${Math.random()}`,
    sessionId: "session-1",
    visitorId: "visitor-1",
    campaignId: null,
    eventType,
    projectId: null,
    path: "/",
    targetUrl: null,
    sectionId: null,
    durationMs: null,
    scrollDepth: null,
    metadata: {},
    occurredAt: "2026-06-11T10:00:00.000Z",
    ...overrides
  };
}

function session(id: string, campaignId: string | null, startedAt: string): AnalyticsSession {
  return {
    id,
    visitorId: `visitor-${id}`,
    campaignId,
    referrer: null,
    geoCountry: null,
    geoRegion: null,
    geoCity: null,
    sourceHint: null,
    startedAt,
    endedAt: null
  };
}

function createPaginatedSessionsClient({
  campaigns = [],
  count,
  events = [],
  projects = [],
  sessions
}: {
  campaigns?: CampaignFact[];
  count: number;
  events?: AnalyticsEvent[];
  projects?: ProjectFact[];
  sessions: AnalyticsSession[];
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "sessions") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(async () => ({
                count,
                data: sessions.map(toSessionRow),
                error: null
              }))
            }))
          }))
        };
      }

      if (table === "events") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(async () => ({
                data: events.map(toEventRow),
                error: null
              }))
            }))
          }))
        };
      }

      if (table === "campaigns") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: campaigns.map((campaign) => ({
                company: campaign.company,
                id: campaign.id,
                role: campaign.role,
                slug: campaign.slug,
                tags: campaign.tags
              })),
              error: null
            }))
          }))
        };
      }

      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: projects.map((project) => ({
                id: project.id,
                slug: project.slug,
                title: project.title
              })),
              error: null
            }))
          }))
        };
      }

      throw new Error(`Unexpected table ${table}`);
    })
  };
}

function createDashboardClient({
  campaigns,
  campaignCount,
  events,
  eventCount,
  projects,
  projectCount,
  sessions,
  sessionCount
}: {
  campaigns: CampaignFact[];
  campaignCount: number;
  events: AnalyticsEvent[];
  eventCount: number;
  projects: ProjectFact[];
  projectCount: number;
  sessions: AnalyticsSession[];
  sessionCount: number;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "events") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({
                count: eventCount,
                data: events.map(toEventRow),
                error: null
              }))
            }))
          }))
        };
      }

      if (table === "sessions") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({
                count: sessionCount,
                data: sessions.map(toSessionRow),
                error: null
              }))
            }))
          }))
        };
      }

      if (table === "campaigns") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(async () => ({
              count: campaignCount,
              data: campaigns.map((campaign) => ({
                company: campaign.company,
                id: campaign.id,
                role: campaign.role,
                slug: campaign.slug,
                tags: campaign.tags
              })),
              error: null
            }))
          }))
        };
      }

      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(async () => ({
              count: projectCount,
              data: projects.map((project) => ({
                id: project.id,
                slug: project.slug,
                title: project.title
              })),
              error: null
            }))
          }))
        };
      }

      throw new Error(`Unexpected table ${table}`);
    })
  };
}

function toSessionRow(value: AnalyticsSession) {
  return {
    campaign_id: value.campaignId,
    ended_at: value.endedAt,
    geo_city: value.geoCity,
    geo_country: value.geoCountry,
    geo_region: value.geoRegion,
    id: value.id,
    referrer: value.referrer,
    source_hint: value.sourceHint,
    started_at: value.startedAt,
    visitor_id: value.visitorId
  };
}

function toEventRow(value: AnalyticsEvent) {
  return {
    campaign_id: value.campaignId,
    duration_ms: value.durationMs,
    event_type: value.eventType,
    id: value.id,
    metadata: value.metadata,
    occurred_at: value.occurredAt,
    path: value.path,
    project_id: value.projectId,
    scroll_depth: value.scrollDepth,
    section_id: value.sectionId,
    session_id: value.sessionId,
    target_url: value.targetUrl,
    visitor_id: value.visitorId
  };
}
