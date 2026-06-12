import { describe, expect, it } from "vitest";
import {
  summarizeCampaignPerformance,
  summarizeFunnel,
  summarizeProjectInterest,
  type AnalyticsEvent,
  type AnalyticsSession,
  type CampaignFact
} from "./analytics";

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
        expands: 1,
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
        expands: 0,
        detailViews: 0,
        prdDeepReads: 0,
        demoClicks: 0,
        averageDwellSeconds: 4.5
      }
    ]);
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
      { key: "project_expand", label: "展开项目", sessions: 2 },
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
    ipAddress: null,
    geoCountry: null,
    geoRegion: null,
    geoCity: null,
    sourceHint: null,
    startedAt,
    endedAt: null
  };
}
