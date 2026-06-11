import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => {
    throw new Error("Supabase env unavailable in route tests");
  })
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
