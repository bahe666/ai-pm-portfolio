"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/client";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    const path = search ? `${pathname}?${search}` : pathname;
    trackEvent({ eventType: "page_view", path });
  }, [pathname, search]);

  return null;
}
