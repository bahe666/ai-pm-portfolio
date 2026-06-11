"use client";

import type { EventPayload } from "./events";

type TrackEventInput = Omit<EventPayload, "path" | "metadata"> & {
  path?: string;
  metadata?: EventPayload["metadata"];
};

const MAX_BATCH_SIZE = 10;
const FLUSH_DELAY_MS = 800;

const queue: EventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersRegistered = false;

export function trackEvent(event: TrackEventInput): void {
  if (typeof window === "undefined") {
    return;
  }

  registerLifecycleFlush();

  queue.push({
    ...event,
    path: event.path ?? getCurrentPath(),
    metadata: event.metadata ?? {}
  });

  if (queue.length >= MAX_BATCH_SIZE) {
    void flushEvents();
    return;
  }

  scheduleFlush();
}

export async function flushEvents(): Promise<void> {
  if (typeof window === "undefined" || queue.length === 0) {
    return;
  }

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const events = queue.splice(0, MAX_BATCH_SIZE);

  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true
    });
  } catch (error) {
    console.error("Failed to flush analytics events", error);
  }

  if (queue.length > 0) {
    scheduleFlush();
  }
}

function scheduleFlush(): void {
  if (flushTimer) {
    return;
  }

  flushTimer = setTimeout(() => {
    void flushEvents();
  }, FLUSH_DELAY_MS);
}

function registerLifecycleFlush(): void {
  if (listenersRegistered || typeof window === "undefined") {
    return;
  }

  listenersRegistered = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushEvents();
    }
  });

  window.addEventListener("pagehide", () => {
    void flushEvents();
  });
}

function getCurrentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}
