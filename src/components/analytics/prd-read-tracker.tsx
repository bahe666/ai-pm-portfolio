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
  const sentinelRef = useRef<HTMLSpanElement | null>(null);
  const activeSectionRef = useRef<{ id: string; startedAt: number } | null>(null);
  const hasTrackedFullViewRef = useRef(false);

  useEffect(() => {
    activeSectionRef.current = null;
    hasTrackedFullViewRef.current = false;

    const metadata = { projectSlug, projectTitle };
    trackEvent({
      eventType: "prd_open",
      projectId,
      metadata
    });

    const flushActiveSection = () => {
      const activeSection = activeSectionRef.current;
      if (!activeSection) return;

      trackDwell(projectId, activeSection.id, activeSection.startedAt, metadata);
      activeSectionRef.current = null;
    };

    if (typeof window.IntersectionObserver !== "function") {
      if (!hasTrackedFullViewRef.current) {
        hasTrackedFullViewRef.current = true;
        trackEvent({
          eventType: "prd_read",
          projectId,
          metadata
        });
      }
      return;
    }

    const sentinel = sentinelRef.current;
    let fullViewObserver: IntersectionObserver | null = null;

    if (sentinel) {
      fullViewObserver = new IntersectionObserver(
        (entries) => {
          if (hasTrackedFullViewRef.current || !entries.some((entry) => entry.isIntersecting)) {
            return;
          }

          hasTrackedFullViewRef.current = true;
          trackEvent({
            eventType: "prd_read",
            projectId,
            metadata
          });
          fullViewObserver?.disconnect();
        },
        { threshold: 0.2 }
      );
      fullViewObserver.observe(sentinel);
    }

    const trackedSectionIds = new Set<string>();
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const heading = headings.find((item) => item.id === entry.target.id);
          if (!heading || activeSectionRef.current?.id === heading.id) continue;

          flushActiveSection();
          activeSectionRef.current = { id: heading.id, startedAt: Date.now() };
          if (trackedSectionIds.has(heading.id)) continue;

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

    for (const heading of headings) {
      const element = document.getElementById(heading.id);
      if (element) {
        sectionObserver.observe(element);
      }
    }

    const handlePageExit = () => {
      flushActiveSection();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handlePageExit();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageExit);

    return () => {
      fullViewObserver?.disconnect();
      sectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageExit);
      handlePageExit();
    };
  }, [headings, projectId, projectSlug, projectTitle]);

  return (
    <span
      aria-hidden="true"
      data-prd-read-sentinel=""
      ref={sentinelRef}
      style={{
        display: "block",
        height: 1,
        overflow: "hidden",
        pointerEvents: "none",
        position: "absolute",
        width: 1
      }}
    />
  );
}

function trackDwell(
  projectId: string,
  sectionId: string,
  startedAt: number,
  metadata: { projectSlug: string; projectTitle: string }
) {
  const durationMs = Math.min(Math.max(Date.now() - startedAt, 0), MAX_DWELL_MS);

  trackEvent({
    eventType: "project_dwell",
    projectId,
    sectionId,
    durationMs,
    metadata
  });
}
