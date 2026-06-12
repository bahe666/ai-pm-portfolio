import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrdReadTracker } from "./prd-read-tracker";

const trackEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: trackEventMock
}));

describe("PrdReadTracker", () => {
  afterEach(() => {
    trackEventMock.mockClear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("tracks full PRD and section views without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    render(
      <PrdReadTracker
        headings={[
          { id: "overview", text: "Overview", depth: 2 },
          { id: "scope", text: "Scope", depth: 2 }
        ]}
        projectId="project-1"
        projectSlug="project-one"
        projectTitle="Project One"
      />
    );

    expect(trackEventMock).toHaveBeenCalledWith({
      eventType: "prd_full_view",
      projectId: "project-1",
      metadata: { projectSlug: "project-one", projectTitle: "Project One" }
    });
    expect(trackEventMock).toHaveBeenCalledWith({
      eventType: "prd_section_view",
      projectId: "project-1",
      sectionId: "overview",
      metadata: { projectSlug: "project-one", projectTitle: "Project One", sectionTitle: "Overview" }
    });
    expect(trackEventMock).toHaveBeenCalledWith({
      eventType: "prd_section_view",
      projectId: "project-1",
      sectionId: "scope",
      metadata: { projectSlug: "project-one", projectTitle: "Project One", sectionTitle: "Scope" }
    });
  });

  it("tracks dwell when the PRD component unmounts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-12T10:00:00.000Z"));
    vi.stubGlobal("IntersectionObserver", undefined);

    const { unmount } = render(
      <PrdReadTracker
        headings={[{ id: "overview", text: "Overview", depth: 2 }]}
        projectId="project-1"
        projectSlug="project-one"
        projectTitle="Project One"
      />
    );

    vi.setSystemTime(new Date("2026-06-12T10:00:07.500Z"));
    unmount();

    expect(trackEventMock).toHaveBeenCalledWith({
      eventType: "section_dwell",
      projectId: "project-1",
      sectionId: "overview",
      durationMs: 7_500,
      metadata: { projectSlug: "project-one", projectTitle: "Project One" }
    });
  });
});
