import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { GET } from "./route";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

describe("GET /api/heartbeat", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("runs a lightweight Supabase read when authorized", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    const select = vi.fn(async () => ({ count: 1, error: null }));
    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      from: vi.fn(() => ({ select }))
    } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const response = await GET(
      new Request("http://localhost/api/heartbeat", {
        headers: { authorization: "Bearer test-secret" }
      })
    );

    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(response.status).toBe(200);
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects requests with an invalid cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret");

    const response = await GET(
      new Request("http://localhost/api/heartbeat", {
        headers: { authorization: "Bearer wrong-secret" }
      })
    );

    await expect(response.json()).resolves.toEqual({ ok: false, error: "unauthorized" });
    expect(response.status).toBe(401);
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("returns 503 when Supabase is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const select = vi.fn(async () => ({ count: null, error: { message: "project paused" } }));
    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      from: vi.fn(() => ({ select }))
    } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const response = await GET(new Request("http://localhost/api/heartbeat"));

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "supabase_heartbeat_failed"
    });
    expect(response.status).toBe(503);
  });
});
