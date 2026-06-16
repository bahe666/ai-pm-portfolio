import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const tableData = vi.hoisted(() => ({
  campaigns: [{ id: "campaign-1" }],
  events: [{ id: "event-1" }],
  profiles: [{ id: "profile-1" }],
  projects: [{ id: "project-1" }],
  sessions: [{ id: "session-1", ip_address: "203.0.113.8" }],
  visitors: [{ id: "visitor-1" }]
}));

const analyticsSummary = vi.hoisted(() => ({
  campaignSummary: { campaigns: [], tagPreferences: [] },
  dataVolume: {
    campaigns: 1,
    events: 1,
    projects: 1,
    sessions: 1
  },
  funnel: [],
  kpis: {
    campaignSessions: 0,
    demoClicks: 0,
    projectDetailViews: 0,
    totalEvents: 1,
    totalSessions: 1,
    totalVisitors: 1
  },
  prdSectionInterest: [],
  projectInterest: [],
  recentSessions: []
}));

const supabaseMocks = vi.hoisted(() => {
  const from = vi.fn((table: keyof typeof tableData) => ({
    select: vi.fn(async () => ({ data: tableData[table], error: null }))
  }));

  return {
    client: { from },
    from
  };
});

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => supabaseMocks.client
}));

vi.mock("@/lib/data/analytics", () => ({
  getAnalyticsDashboard: vi.fn(async () => analyticsSummary)
}));

describe("GET /api/admin/backups", () => {
  it("exports backup tables and analytics summary as top-level JSON keys", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({
      analyticsSummary,
      campaigns: tableData.campaigns,
      events: tableData.events,
      profiles: tableData.profiles,
      projects: tableData.projects,
      sessions: [{ id: "session-1" }],
      visitors: tableData.visitors
    });
    expect(body.exportedAt).toEqual(expect.any(String));
    expect(body.tables).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("ip_address");
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename="portfolio-backup-/);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
