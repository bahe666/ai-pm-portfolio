import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const tableData = vi.hoisted(() => ({
  campaigns: [{ id: "campaign-1" }],
  events: [{ id: "event-1" }],
  profiles: [{ id: "profile-1" }],
  projects: [{ id: "project-1" }],
  sessions: [{ id: "session-1" }],
  visitors: [{ id: "visitor-1" }]
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

describe("GET /api/admin/backups", () => {
  it("exports backup tables as top-level JSON keys", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({
      campaigns: tableData.campaigns,
      events: tableData.events,
      profiles: tableData.profiles,
      projects: tableData.projects,
      sessions: tableData.sessions,
      visitors: tableData.visitors
    });
    expect(body.exportedAt).toEqual(expect.any(String));
    expect(body.tables).toBeUndefined();
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename="portfolio-backup-/);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
