import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectDetailTracker } from "./project-detail-tracker";

const trackEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: trackEventMock
}));

describe("ProjectDetailTracker", () => {
  afterEach(() => {
    trackEventMock.mockClear();
  });

  it("tracks direct project detail page views", () => {
    render(<ProjectDetailTracker projectId="project-1" projectSlug="project-one" projectTitle="Project One" />);

    expect(trackEventMock).toHaveBeenCalledWith({
      eventType: "project_detail_open",
      projectId: "project-1",
      metadata: { projectSlug: "project-one", projectTitle: "Project One" }
    });
  });
});
