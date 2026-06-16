"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

type ProjectDetailTrackerProps = {
  projectId: string;
  projectSlug: string;
  projectTitle: string;
};

export function ProjectDetailTracker({ projectId, projectSlug, projectTitle }: ProjectDetailTrackerProps) {
  useEffect(() => {
    trackEvent({
      eventType: "project_detail_open",
      projectId,
      metadata: {
        projectSlug,
        projectTitle
      }
    });
  }, [projectId, projectSlug, projectTitle]);

  return null;
}
