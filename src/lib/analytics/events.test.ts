import { describe, expect, it } from "vitest";
import { EventPayloadSchema, normalizeEventPayload } from "./events";

describe("EventPayloadSchema", () => {
  it("accepts a project expand event", () => {
    const parsed = EventPayloadSchema.parse({
      eventType: "project_expand",
      path: "/",
      projectId: "11111111-1111-4111-8111-111111111111",
      metadata: { expanded: true }
    });

    expect(parsed.eventType).toBe("project_expand");
    expect(parsed.metadata).toEqual({ expanded: true });
  });

  it("rejects browser environment fields that are outside first-version scope", () => {
    for (const blockedKey of ["browser", "os", "language", "screenWidth", "screenHeight"]) {
      const metadataValue = blockedKey === "screenWidth" || blockedKey === "screenHeight" ? 1440 : "blocked";

      expect(() =>
        EventPayloadSchema.parse({
          eventType: "page_view",
          path: "/",
          metadata: { [blockedKey]: metadataValue }
        })
      ).toThrow();
    }
  });
});

describe("normalizeEventPayload", () => {
  it("adds default metadata and clamps duration", () => {
    expect(
      normalizeEventPayload({
        eventType: "section_dwell",
        path: "/projects/agent",
        sectionId: "prd-overview",
        durationMs: 999_999
      })
    ).toMatchObject({
      eventType: "section_dwell",
      metadata: {},
      durationMs: 600_000
    });
  });

  it("rejects invalid duration numbers before clamping", () => {
    for (const durationMs of [Infinity, 600_000.5]) {
      expect(() =>
        normalizeEventPayload({
          eventType: "section_dwell",
          path: "/projects/agent",
          sectionId: "prd-overview",
          durationMs
        })
      ).toThrow();
    }
  });

  it("limits metadata size and string length", () => {
    expect(() =>
      normalizeEventPayload({
        eventType: "page_view",
        path: "/",
        metadata: Object.fromEntries(Array.from({ length: 21 }, (_, index) => [`key${index}`, index]))
      })
    ).toThrow();

    expect(() =>
      normalizeEventPayload({
        eventType: "page_view",
        path: "/",
        metadata: { note: "x".repeat(501) }
      })
    ).toThrow();
  });
});
