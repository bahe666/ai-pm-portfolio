"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics/client";
import type { EventPayload } from "@/lib/analytics/events";

type TrackedLinkProps = {
  children: ReactNode;
  className?: string;
  eventType: EventPayload["eventType"];
  href: string;
  metadata?: EventPayload["metadata"];
  projectId?: string;
  rel?: string;
  target?: string;
  targetUrl?: string;
};

export function TrackedLink({
  children,
  className,
  eventType,
  href,
  metadata,
  projectId,
  rel,
  target,
  targetUrl
}: TrackedLinkProps) {
  const handleClick = () => {
    trackEvent({
      eventType,
      projectId,
      targetUrl: targetUrl ?? toAbsoluteTargetUrl(href),
      metadata
    });
  };

  if (isInternalHref(href)) {
    return (
      <Link className={className} href={href} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <a className={className} href={href} onClick={handleClick} rel={rel} target={target}>
      {children}
    </a>
  );
}

function isInternalHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#");
}

function toAbsoluteTargetUrl(href: string): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return new URL(href, window.location.origin).toString();
  } catch {
    return undefined;
  }
}
