import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();

  return {
    ...actual,
    after: vi.fn((callback: () => unknown) => {
      void callback();
    })
  };
});

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(createSupabaseAdminClient).mockImplementation(() => {
      throw new Error("Supabase env unavailable in route tests");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a single event and writes visitor/session cookies", async () => {
    const response = await POST(
      createEventRequest({
        eventType: "page_view",
        path: "/"
      })
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("portfolio_visitor=visitor_");
    expect(response.headers.get("set-cookie")).toContain("portfolio_session=");
  });

  it("accepts a batch envelope", async () => {
    const response = await POST(
      createEventRequest({
        events: [
          { eventType: "page_view", path: "/" },
          {
            eventType: "demo_click",
            path: "/",
            projectId: "11111111-1111-4111-8111-111111111111",
            targetUrl: "https://example.com"
          }
        ]
      })
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
  });

  it("rejects invalid payloads with 400", async () => {
    const response = await POST(
      createEventRequest({
        eventType: "page_view",
        path: "/",
        metadata: { browser: "blocked" }
      })
    );

    expect(response.status).toBe(400);
  });

  it("rejects a non-array events envelope even when it also looks like a single event", async () => {
    const response = await POST(
      createEventRequest({
        events: "bad",
        eventType: "page_view",
        path: "/"
      })
    );

    expect(response.status).toBe(400);
  });

  it("remints invalid visitor and session cookies", async () => {
    const response = await POST(
      createEventRequest(
        {
          eventType: "page_view",
          path: "/"
        },
        {
          cookie: "portfolio_visitor=bad; portfolio_session=not-a-uuid"
        }
      )
    );

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toContain("portfolio_visitor=bad");
    expect(setCookie).not.toContain("portfolio_session=not-a-uuid");
    expect(setCookie).toContain("portfolio_visitor=visitor_");
    expect(setCookie).toContain("portfolio_session=");
    expect(response.status).toBe(200);
  });

  it("stores geo attribution without persisting the raw IP address", async () => {
    const supabase = createSupabaseMock();
    vi.mocked(createSupabaseAdminClient).mockReturnValue(supabase.client);

    const response = await POST(
      createEventRequest(
        {
          eventType: "page_view",
          path: "/"
        },
        {
          "x-forwarded-for": "203.0.113.10, 198.51.100.5",
          "x-vercel-ip-country": "US",
          "x-vercel-ip-country-region": "CA",
          "x-vercel-ip-city": "San Francisco"
        }
      )
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(supabase.sessionsUpsert.mock.calls[0]?.[0]).not.toHaveProperty("ip_address");
    expect(supabase.sessionsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        geo_country: "US",
        geo_region: "CA",
        geo_city: "San Francisco"
      }),
      { onConflict: "id" }
    );
  });
});

function createEventRequest(body: unknown, headers?: HeadersInit): NextRequest {
  return new NextRequest("http://localhost/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function createSupabaseMock() {
  const visitorsUpsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { id: "visitor-row-1" }, error: null }))
    }))
  }));
  const sessionsUpsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { id: "session-row-1" }, error: null }))
    }))
  }));
  const eventsInsert = vi.fn(async () => ({ error: null }));

  return {
    client: {
      from: vi.fn((table: string) => {
        if (table === "visitors") {
          return { upsert: visitorsUpsert };
        }
        if (table === "sessions") {
          return { upsert: sessionsUpsert };
        }
        if (table === "events") {
          return { insert: eventsInsert };
        }
        throw new Error(`Unexpected table: ${table}`);
      })
    } as ReturnType<typeof createSupabaseAdminClient>,
    sessionsUpsert
  };
}
