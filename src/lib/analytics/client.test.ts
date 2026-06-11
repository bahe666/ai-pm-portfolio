import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("analytics client queue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("drops 4xx poison batches so later events can flush", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { flushEvents, trackEvent } = await loadClient();

    trackEvent(createEvent("poison"));
    await flushEvents();
    trackEvent(createEvent("valid"));
    await flushEvents();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getPostedMarkers(fetchMock, 1)).toEqual(["valid"]);
  });

  it("abandons retryable batches after a bounded number of failures so later events can flush", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { flushEvents, trackEvent } = await loadClient();

    trackEvent(createEvent("retryable"));
    await flushEvents();
    await flushEvents();
    await flushEvents();
    trackEvent(createEvent("later"));
    await flushEvents();

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(getPostedMarkers(fetchMock, 3)).toEqual(["later"]);
  });
});

async function loadClient(): Promise<typeof import("./client")> {
  vi.resetModules();
  return import("./client");
}

function createEvent(marker: string) {
  return {
    eventType: "page_view" as const,
    path: "/",
    metadata: { marker }
  };
}

function getPostedMarkers(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): string[] {
  const [, init] = fetchMock.mock.calls[callIndex] as [string, RequestInit];
  const body = JSON.parse(String(init.body)) as { events: Array<{ metadata?: { marker?: string } }> };

  return body.events.map((event) => event.metadata?.marker ?? "");
}
