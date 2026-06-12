"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { MarkdownHeading } from "@/lib/markdown";

type PrdReadTrackerProps = {
  headings: MarkdownHeading[];
  projectId: string;
  projectSlug: string;
  projectTitle: string;
};

const MAX_DWELL_MS = 600_000;

export function PrdReadTracker({ headings, projectId, projectSlug, projectTitle }: PrdReadTrackerProps) {
  const startedAtRef = useRef(0);
  const activeSectionIdRef = useRef(headings[0]?.id ?? "prd");
  const hasTrackedDwellRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = Date.now();
    activeSectionIdRef.current = headings[0]?.id ?? "prd";
    hasTrackedDwellRef.current = false;

    const metadata = { projectSlug, projectTitle };
    const trackSectionFallback = () => {
      for (const heading of headings) {
        trackEvent({
          eventType: "prd_section_view",
          projectId,
          sectionId: heading.id,
          metadata: {
            ...metadata,
            sectionTitle: heading.text
          }
        });
      }
    };

    trackEvent({
      eventType: "prd_full_view",
      projectId,
      metadata
    });

    let observer: IntersectionObserver | null = null;

    if (typeof window.IntersectionObserver !== "function") {
      trackSectionFallback();
    } else {
      const trackedSectionIds = new Set<string>();
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const heading = headings.find((item) => item.id === entry.target.id);
            if (!heading || trackedSectionIds.has(heading.id)) continue;

            activeSectionIdRef.current = heading.id;
            trackedSectionIds.add(heading.id);
            trackEvent({
              eventType: "prd_section_view",
              projectId,
              sectionId: heading.id,
              metadata: {
                ...metadata,
                sectionTitle: heading.text
              }
            });
          }
        },
        { rootMargin: "0px 0px -45% 0px", threshold: 0.2 }
      );

      let observedCount = 0;
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (element) {
          observer.observe(element);
          observedCount += 1;
        }
      }

      if (observedCount === 0) {
        observer.disconnect();
        observer = null;
        trackSectionFallback();
      }
    }

    const handlePageExit = () => {
      if (hasTrackedDwellRef.current) return;
      hasTrackedDwellRef.current = true;
      trackDwell(projectId, activeSectionIdRef.current, startedAtRef.current, metadata);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handlePageExit();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageExit);

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageExit);
      handlePageExit();
    };
  }, [headings, projectId, projectSlug, projectTitle]);

  return null;
}

function trackDwell(
  projectId: string,
  sectionId: string,
  startedAt: number,
  metadata: { projectSlug: string; projectTitle: string }
) {
  const durationMs = Math.min(Math.max(Date.now() - startedAt, 0), MAX_DWELL_MS);

  trackEvent({
    eventType: "section_dwell",
    projectId,
    sectionId,
    durationMs,
    metadata
  });
}
