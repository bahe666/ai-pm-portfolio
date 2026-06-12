import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrdReadTracker } from "./prd-read-tracker";

const trackEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: trackEventMock
}));

type ObservedElement = Element & {
  dataset?: DOMStringMap;
};

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly callback: IntersectionObserverCallback;
  readonly observedElements: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn((element: Element) => {
    this.observedElements.push(element);
  });

  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);

  enter(element: Element) {
    act(() => {
      this.callback(
        [
          {
            isIntersecting: true,
            target: element
          } as IntersectionObserverEntry
        ],
        this as unknown as IntersectionObserver
      );
    });
  }
}

describe("PrdReadTracker", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    trackEventMock.mockClear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not track PRD reading before the PRD enters the viewport", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    const { unmount } = render(
      <PrdReadTracker
        headings={[{ id: "overview", text: "Overview", depth: 2 }]}
        projectId="project-1"
        projectSlug="project-one"
        projectTitle="Project One"
      />
    );

    unmount();

    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("tracks full PRD only after the PRD sentinel enters the viewport", () => {
    const { container } = render(
      <PrdReadTracker
        headings={[{ id: "overview", text: "Overview", depth: 2 }]}
        projectId="project-1"
        projectSlug="project-one"
        projectTitle="Project One"
      />
    );
    const sentinel = container.querySelector("[data-prd-read-sentinel]");

    expect(sentinel).toBeInTheDocument();
    expect(trackEventMock).not.toHaveBeenCalled();

    sentinelObserver().enter(sentinel as Element);

    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith({
      eventType: "prd_full_view",
      projectId: "project-1",
      metadata: { projectSlug: "project-one", projectTitle: "Project One" }
    });
  });

  it("tracks section view and dwell only after a heading enters the viewport", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-12T10:00:00.000Z"));

    const { unmount } = render(
      <>
        <h2 id="overview">Overview</h2>
        <PrdReadTracker
          headings={[{ id: "overview", text: "Overview", depth: 2 }]}
          projectId="project-1"
          projectSlug="project-one"
          projectTitle="Project One"
        />
      </>
    );
    const heading = document.getElementById("overview");

    expect(heading).toBeInTheDocument();
    expect(trackEventMock).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-06-12T10:00:03.000Z"));
    headingObserver().enter(heading as Element);

    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith({
      eventType: "prd_section_view",
      projectId: "project-1",
      sectionId: "overview",
      metadata: { projectSlug: "project-one", projectTitle: "Project One", sectionTitle: "Overview" }
    });

    vi.setSystemTime(new Date("2026-06-12T10:00:10.500Z"));
    unmount();

    expect(trackEventMock).toHaveBeenCalledWith({
      eventType: "section_dwell",
      projectId: "project-1",
      sectionId: "overview",
      durationMs: 7_500,
      metadata: { projectSlug: "project-one", projectTitle: "Project One" }
    });
  });

  it("does not track dwell when no heading entered the viewport", () => {
    const { unmount } = render(
      <>
        <h2 id="overview">Overview</h2>
        <PrdReadTracker
          headings={[{ id: "overview", text: "Overview", depth: 2 }]}
          projectId="project-1"
          projectSlug="project-one"
          projectTitle="Project One"
        />
      </>
    );

    unmount();

    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("records dwell when active sections change and updates active state for revisits", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-12T10:00:00.000Z"));

    const { unmount } = render(
      <>
        <h2 id="section-a">Section A</h2>
        <h2 id="section-b">Section B</h2>
        <PrdReadTracker
          headings={[
            { id: "section-a", text: "Section A", depth: 2 },
            { id: "section-b", text: "Section B", depth: 2 }
          ]}
          projectId="project-1"
          projectSlug="project-one"
          projectTitle="Project One"
        />
      </>
    );
    const sectionA = document.getElementById("section-a") as Element;
    const sectionB = document.getElementById("section-b") as Element;

    headingObserver("section-a").enter(sectionA);

    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenLastCalledWith({
      eventType: "prd_section_view",
      projectId: "project-1",
      sectionId: "section-a",
      metadata: { projectSlug: "project-one", projectTitle: "Project One", sectionTitle: "Section A" }
    });

    vi.setSystemTime(new Date("2026-06-12T10:00:04.000Z"));
    headingObserver("section-b").enter(sectionB);

    expect(trackEventMock).toHaveBeenNthCalledWith(2, {
      eventType: "section_dwell",
      projectId: "project-1",
      sectionId: "section-a",
      durationMs: 4_000,
      metadata: { projectSlug: "project-one", projectTitle: "Project One" }
    });
    expect(trackEventMock).toHaveBeenNthCalledWith(3, {
      eventType: "prd_section_view",
      projectId: "project-1",
      sectionId: "section-b",
      metadata: { projectSlug: "project-one", projectTitle: "Project One", sectionTitle: "Section B" }
    });

    vi.setSystemTime(new Date("2026-06-12T10:00:09.000Z"));
    headingObserver("section-a").enter(sectionA);

    expect(trackEventMock).toHaveBeenCalledTimes(4);
    expect(trackEventMock).toHaveBeenLastCalledWith({
      eventType: "section_dwell",
      projectId: "project-1",
      sectionId: "section-b",
      durationMs: 5_000,
      metadata: { projectSlug: "project-one", projectTitle: "Project One" }
    });

    vi.setSystemTime(new Date("2026-06-12T10:00:11.500Z"));
    unmount();

    expect(trackEventMock).toHaveBeenCalledTimes(5);
    expect(trackEventMock).toHaveBeenLastCalledWith({
      eventType: "section_dwell",
      projectId: "project-1",
      sectionId: "section-a",
      durationMs: 2_500,
      metadata: { projectSlug: "project-one", projectTitle: "Project One" }
    });
  });
});

function sentinelObserver() {
  const observer = MockIntersectionObserver.instances.find((instance) =>
    instance.observedElements.some((element) => (element as ObservedElement).dataset?.prdReadSentinel !== undefined)
  );
  if (!observer) throw new Error("PRD sentinel observer was not registered");
  return observer;
}

function headingObserver(id = "overview") {
  const observer = MockIntersectionObserver.instances.find((instance) =>
    instance.observedElements.some((element) => element.id === id)
  );
  if (!observer) throw new Error("Heading observer was not registered");
  return observer;
}
