import type { EventType } from "@/lib/types";

export type AnalyticsEvent = {
  id: string;
  sessionId: string;
  visitorId: string;
  campaignId: string | null;
  eventType: EventType;
  projectId: string | null;
  path: string;
  targetUrl: string | null;
  sectionId: string | null;
  durationMs: number | null;
  scrollDepth: number | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

export type AnalyticsSession = {
  id: string;
  visitorId: string;
  campaignId: string | null;
  referrer: string | null;
  ipAddress: string | null;
  geoCountry: string | null;
  geoRegion: string | null;
  geoCity: string | null;
  sourceHint: string | null;
  startedAt: string;
  endedAt: string | null;
};

export type ProjectFact = {
  id: string;
  title: string;
  slug: string;
};

export type CampaignFact = {
  id: string;
  company: string;
  role: string;
  tags: string[];
  slug: string;
};

export type ProjectInterest = {
  projectId: string;
  title: string;
  slug: string | null;
  impressions: number;
  expands: number;
  detailViews: number;
  prdDeepReads: number;
  demoClicks: number;
  averageDwellSeconds: number;
};

export type FunnelStep = {
  key: "page_view" | "project_impression" | "project_detail_view" | "prd_full_view" | "demo_click";
  label: string;
  sessions: number;
};

export type CampaignPerformance = {
  campaignId: string;
  company: string;
  role: string;
  slug: string;
  tags: string[];
  sessions: number;
  projectDetailViews: number;
  demoClicks: number;
  lastSeenAt: string | null;
};

export type TagPreference = {
  tag: string;
  sessions: number;
  projectDetailViews: number;
  demoClicks: number;
};

export type CampaignSummary = {
  campaigns: CampaignPerformance[];
  tagPreferences: TagPreference[];
};

export type PrdSectionInterest = {
  sectionId: string;
  views: number;
  averageDwellSeconds: number;
};

export type RecentSessionSummary = {
  sessionId: string;
  visitorId: string;
  campaignLabel: string;
  startedAt: string;
  lastEventAt: string | null;
  ipAddress: string | null;
  location: string;
  sourceHint: string | null;
  paths: string[];
  events: Array<{
    eventType: EventType;
    projectTitle: string | null;
    path: string;
    targetUrl: string | null;
    occurredAt: string;
  }>;
};

export type AnalyticsDashboardData = {
  kpis: {
    totalSessions: number;
    totalVisitors: number;
    totalEvents: number;
    campaignSessions: number;
    demoClicks: number;
    projectDetailViews: number;
  };
  projectInterest: ProjectInterest[];
  funnel: FunnelStep[];
  campaignSummary: CampaignSummary;
  prdSectionInterest: PrdSectionInterest[];
  recentSessions: RecentSessionSummary[];
};

const FUNNEL_STEPS: FunnelStep[] = [
  { key: "page_view", label: "访问页面", sessions: 0 },
  { key: "project_impression", label: "看到项目", sessions: 0 },
  { key: "project_detail_view", label: "进入详情", sessions: 0 },
  { key: "prd_full_view", label: "阅读 PRD", sessions: 0 },
  { key: "demo_click", label: "点击 Demo/外链", sessions: 0 }
];

export function summarizeProjectInterest(events: AnalyticsEvent[], projects: ProjectFact[] = []): ProjectInterest[] {
  const projectFacts = new Map(projects.map((project) => [project.id, project]));
  const summaries = new Map<string, ProjectInterest & { dwellTotalMs: number; dwellCount: number }>();

  for (const event of events) {
    if (!event.projectId) continue;
    const fact = projectFacts.get(event.projectId);
    const summary = getProjectInterestSummary(summaries, event.projectId, fact);

    if (event.eventType === "project_impression") summary.impressions += 1;
    if (event.eventType === "project_expand") summary.expands += 1;
    if (event.eventType === "project_detail_view") summary.detailViews += 1;
    if (event.eventType === "prd_full_view" || event.eventType === "prd_section_view") summary.prdDeepReads += 1;
    if (event.eventType === "demo_click" || event.eventType === "external_link_click") summary.demoClicks += 1;
    if (event.eventType === "section_dwell" && typeof event.durationMs === "number") {
      summary.dwellTotalMs += event.durationMs;
      summary.dwellCount += 1;
    }
  }

  return Array.from(summaries.values())
    .map(({ dwellTotalMs, dwellCount, ...summary }) => ({
      ...summary,
      averageDwellSeconds: dwellCount > 0 ? roundSeconds(dwellTotalMs / dwellCount) : 0
    }))
    .sort((a, b) => b.detailViews - a.detailViews || b.expands - a.expands || b.impressions - a.impressions);
}

export function summarizeFunnel(events: AnalyticsEvent[]): FunnelStep[] {
  return FUNNEL_STEPS.map((step) => {
    const sessionIds = new Set(
      events
        .filter((event) =>
          step.key === "demo_click"
            ? event.eventType === "demo_click" || event.eventType === "external_link_click"
            : event.eventType === step.key
        )
        .map((event) => event.sessionId)
    );

    return {
      ...step,
      sessions: sessionIds.size
    };
  });
}

export function summarizeCampaignPerformance(
  events: AnalyticsEvent[],
  sessions: AnalyticsSession[],
  campaigns: CampaignFact[]
): CampaignSummary {
  const eventsByCampaign = groupEventsByCampaign(events);
  const sessionsByCampaign = groupSessionsByCampaign(sessions);

  const campaignSummaries = campaigns
    .map((campaign) => {
      const campaignSessions = sessionsByCampaign.get(campaign.id) ?? [];
      const campaignEvents = eventsByCampaign.get(campaign.id) ?? [];

      return {
        campaignId: campaign.id,
        company: campaign.company,
        role: campaign.role,
        slug: campaign.slug,
        tags: campaign.tags,
        sessions: campaignSessions.length,
        projectDetailViews: campaignEvents.filter((event) => event.eventType === "project_detail_view").length,
        demoClicks: campaignEvents.filter((event) => event.eventType === "demo_click" || event.eventType === "external_link_click").length,
        lastSeenAt: getLastSeenAt(campaignSessions)
      };
    })
    .sort((a, b) => b.sessions - a.sessions || b.projectDetailViews - a.projectDetailViews || a.company.localeCompare(b.company));

  const tagSummaries = new Map<string, TagPreference>();
  for (const campaign of campaignSummaries) {
    for (const tag of campaign.tags) {
      const summary = tagSummaries.get(tag) ?? { tag, sessions: 0, projectDetailViews: 0, demoClicks: 0 };
      summary.sessions += campaign.sessions;
      summary.projectDetailViews += campaign.projectDetailViews;
      summary.demoClicks += campaign.demoClicks;
      tagSummaries.set(tag, summary);
    }
  }

  return {
    campaigns: campaignSummaries,
    tagPreferences: Array.from(tagSummaries.values()).sort(
      (a, b) => b.sessions - a.sessions || b.projectDetailViews - a.projectDetailViews || a.tag.localeCompare(b.tag)
    )
  };
}

export function summarizePrdSectionInterest(events: AnalyticsEvent[]): PrdSectionInterest[] {
  const sections = new Map<string, PrdSectionInterest & { dwellTotalMs: number; dwellCount: number }>();

  for (const event of events) {
    if (!event.sectionId) continue;
    const summary = sections.get(event.sectionId) ?? {
      sectionId: event.sectionId,
      views: 0,
      averageDwellSeconds: 0,
      dwellTotalMs: 0,
      dwellCount: 0
    };

    if (event.eventType === "prd_section_view") summary.views += 1;
    if (event.eventType === "section_dwell" && typeof event.durationMs === "number") {
      summary.dwellTotalMs += event.durationMs;
      summary.dwellCount += 1;
    }
    sections.set(event.sectionId, summary);
  }

  return Array.from(sections.values())
    .map(({ dwellTotalMs, dwellCount, ...summary }) => ({
      ...summary,
      averageDwellSeconds: dwellCount > 0 ? roundSeconds(dwellTotalMs / dwellCount) : 0
    }))
    .sort((a, b) => b.views - a.views || b.averageDwellSeconds - a.averageDwellSeconds);
}

export function summarizeRecentSessions(
  events: AnalyticsEvent[],
  sessions: AnalyticsSession[],
  campaigns: CampaignFact[],
  projects: ProjectFact[]
): RecentSessionSummary[] {
  const campaignFacts = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const projectFacts = new Map(projects.map((project) => [project.id, project]));
  const eventsBySession = new Map<string, AnalyticsEvent[]>();

  for (const event of events) {
    const existing = eventsBySession.get(event.sessionId) ?? [];
    existing.push(event);
    eventsBySession.set(event.sessionId, existing);
  }

  return sessions
    .slice()
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, 12)
    .map((session) => {
      const sessionEvents = (eventsBySession.get(session.id) ?? [])
        .slice()
        .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
      const campaign = session.campaignId ? campaignFacts.get(session.campaignId) : null;

      return {
        sessionId: session.id,
        visitorId: session.visitorId,
        campaignLabel: campaign ? `${campaign.company} / ${campaign.role}` : "直接访问",
        startedAt: session.startedAt,
        lastEventAt: sessionEvents.at(-1)?.occurredAt ?? null,
        ipAddress: session.ipAddress,
        location: formatLocation(session),
        sourceHint: session.sourceHint,
        paths: Array.from(new Set(sessionEvents.map((event) => event.path))).slice(0, 5),
        events: sessionEvents
          .filter((event) => event.eventType !== "project_expand")
          .slice(-6)
          .map((event) => ({
            eventType: event.eventType,
            projectTitle: event.projectId ? projectFacts.get(event.projectId)?.title ?? event.projectId : null,
            path: event.path,
            targetUrl: event.targetUrl,
            occurredAt: event.occurredAt
          }))
      };
    });
}

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboardData> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createSupabaseAdminClient();

  const [eventsResult, sessionsResult, campaignsResult, projectsResult] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id,session_id,visitor_id,campaign_id,event_type,project_id,path,target_url,section_id,duration_ms,scroll_depth,metadata,occurred_at"
      )
      .order("occurred_at", { ascending: false })
      .limit(1200),
    supabase
      .from("sessions")
      .select("id,visitor_id,campaign_id,referrer,ip_address,geo_country,geo_region,geo_city,source_hint,started_at,ended_at")
      .order("started_at", { ascending: false })
      .limit(300),
    supabase.from("campaigns").select("id,company,role,tags,slug").order("created_at", { ascending: false }),
    supabase.from("projects").select("id,title,slug").order("sort_order", { ascending: true })
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (sessionsResult.error) throw sessionsResult.error;
  if (campaignsResult.error) throw campaignsResult.error;
  if (projectsResult.error) throw projectsResult.error;

  const events = (eventsResult.data ?? []).map(toAnalyticsEvent);
  const sessions = (sessionsResult.data ?? []).map(toAnalyticsSession);
  const campaigns = (campaignsResult.data ?? []).map(toCampaignFact);
  const projects = (projectsResult.data ?? []).map(toProjectFact);

  return {
    kpis: {
      totalSessions: sessions.length,
      totalVisitors: new Set(sessions.map((session) => session.visitorId)).size,
      totalEvents: events.length,
      campaignSessions: sessions.filter((session) => session.campaignId).length,
      demoClicks: events.filter((event) => event.eventType === "demo_click" || event.eventType === "external_link_click").length,
      projectDetailViews: events.filter((event) => event.eventType === "project_detail_view").length
    },
    projectInterest: summarizeProjectInterest(events, projects),
    funnel: summarizeFunnel(events),
    campaignSummary: summarizeCampaignPerformance(events, sessions, campaigns),
    prdSectionInterest: summarizePrdSectionInterest(events),
    recentSessions: summarizeRecentSessions(events, sessions, campaigns, projects)
  };
}

function getProjectInterestSummary(
  summaries: Map<string, ProjectInterest & { dwellTotalMs: number; dwellCount: number }>,
  projectId: string,
  project: ProjectFact | undefined
) {
  const existing = summaries.get(projectId);
  if (existing) return existing;

  const summary = {
    projectId,
    title: project?.title ?? projectId,
    slug: project?.slug ?? null,
    impressions: 0,
    expands: 0,
    detailViews: 0,
    prdDeepReads: 0,
    demoClicks: 0,
    averageDwellSeconds: 0,
    dwellTotalMs: 0,
    dwellCount: 0
  };
  summaries.set(projectId, summary);
  return summary;
}

function groupEventsByCampaign(events: AnalyticsEvent[]) {
  const groups = new Map<string, AnalyticsEvent[]>();
  for (const event of events) {
    if (!event.campaignId) continue;
    const existing = groups.get(event.campaignId) ?? [];
    existing.push(event);
    groups.set(event.campaignId, existing);
  }
  return groups;
}

function groupSessionsByCampaign(sessions: AnalyticsSession[]) {
  const groups = new Map<string, AnalyticsSession[]>();
  for (const session of sessions) {
    if (!session.campaignId) continue;
    const existing = groups.get(session.campaignId) ?? [];
    existing.push(session);
    groups.set(session.campaignId, existing);
  }
  return groups;
}

function getLastSeenAt(sessions: AnalyticsSession[]) {
  return sessions
    .map((session) => session.startedAt)
    .sort((a, b) => Date.parse(b) - Date.parse(a))
    .at(0) ?? null;
}

function formatLocation(session: AnalyticsSession) {
  const parts = [session.geoCountry, session.geoRegion, session.geoCity].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "未知";
}

function toAnalyticsEvent(row: Record<string, unknown>): AnalyticsEvent {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    visitorId: String(row.visitor_id),
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
    eventType: row.event_type as EventType,
    projectId: row.project_id ? String(row.project_id) : null,
    path: String(row.path),
    targetUrl: row.target_url ? String(row.target_url) : null,
    sectionId: row.section_id ? String(row.section_id) : null,
    durationMs: typeof row.duration_ms === "number" ? row.duration_ms : null,
    scrollDepth: typeof row.scroll_depth === "number" ? row.scroll_depth : null,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    occurredAt: String(row.occurred_at)
  };
}

function toAnalyticsSession(row: Record<string, unknown>): AnalyticsSession {
  return {
    id: String(row.id),
    visitorId: String(row.visitor_id),
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
    referrer: row.referrer ? String(row.referrer) : null,
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    geoCountry: row.geo_country ? String(row.geo_country) : null,
    geoRegion: row.geo_region ? String(row.geo_region) : null,
    geoCity: row.geo_city ? String(row.geo_city) : null,
    sourceHint: row.source_hint ? String(row.source_hint) : null,
    startedAt: String(row.started_at),
    endedAt: row.ended_at ? String(row.ended_at) : null
  };
}

function toCampaignFact(row: Record<string, unknown>): CampaignFact {
  return {
    id: String(row.id),
    company: String(row.company),
    role: String(row.role),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    slug: String(row.slug)
  };
}

function toProjectFact(row: Record<string, unknown>): ProjectFact {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roundSeconds(milliseconds: number) {
  return Math.round((milliseconds / 1000) * 10) / 10;
}
