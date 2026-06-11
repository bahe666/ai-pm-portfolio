"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";

type ProjectImpressionProps = {
  children: ReactNode;
  className?: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
};

export function ProjectImpression({
  children,
  className,
  projectId,
  projectSlug,
  projectTitle
}: ProjectImpressionProps) {
  const ref = useRef<HTMLElement | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasTrackedRef.current) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      hasTrackedRef.current = true;
      trackEvent({
        eventType: "project_impression",
        projectId,
        metadata: {
          projectSlug,
          projectTitle
        }
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (hasTrackedRef.current || !entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        hasTrackedRef.current = true;
        trackEvent({
          eventType: "project_impression",
          projectId,
          metadata: {
            projectSlug,
            projectTitle
          }
        });
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [projectId, projectSlug, projectTitle]);

  return (
    <article ref={ref} className={className} data-project-id={projectId}>
      {children}
    </article>
  );
}
