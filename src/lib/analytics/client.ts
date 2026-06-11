"use client";

import type { EventPayload } from "./events";

type TrackEventInput = Omit<EventPayload, "path" | "metadata"> & {
  path?: string;
  metadata?: EventPayload["metadata"];
};

type QueuedBatch = {
  events: EventPayload[];
  retryCount: number;
};

const MAX_BATCH_SIZE = 10;
const MAX_QUEUE_SIZE = 50;
const MAX_RETRY_COUNT = 2;
const FLUSH_DELAY_MS = 800;

const queue: QueuedBatch[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersRegistered = false;

export function trackEvent(event: TrackEventInput): void {
  if (typeof window === "undefined") {
    return;
  }

  registerLifecycleFlush();

  enqueueEvent({
    ...event,
    path: event.path ?? getCurrentPath(),
    metadata: event.metadata ?? {}
  });

  if (getQueuedEventCount() >= MAX_BATCH_SIZE) {
    void flushEvents();
    return;
  }

  scheduleFlush();
}

export async function flushEvents(): Promise<void> {
  if (typeof window === "undefined" || getQueuedEventCount() === 0) {
    return;
  }

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const batch = queue.shift();
  if (!batch) {
    return;
  }

  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch.events }),
      keepalive: true
    });

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        console.error("Dropping analytics events after client error", new Error(`HTTP ${response.status}`));
      } else {
        requeueRetryableBatch(batch, new Error(`HTTP ${response.status}`));
      }
    }
  } catch (error) {
    requeueRetryableBatch(batch, error);
  }

  if (getQueuedEventCount() > 0) {
    scheduleFlush();
  }
}

function enqueueEvent(event: EventPayload): void {
  const lastBatch = queue.at(-1);

  if (lastBatch && lastBatch.retryCount === 0 && lastBatch.events.length < MAX_BATCH_SIZE) {
    lastBatch.events.push(event);
  } else {
    queue.push({ events: [event], retryCount: 0 });
  }

  trimQueue();
}

function requeueRetryableBatch(batch: QueuedBatch, error: unknown): void {
  if (batch.retryCount >= MAX_RETRY_COUNT) {
    console.error("Dropping analytics events after retry limit", error);
    return;
  }

  queue.push({
    events: batch.events,
    retryCount: batch.retryCount + 1
  });
  trimQueue();
  console.error("Failed to flush analytics events", error);
}

function getQueuedEventCount(): number {
  return queue.reduce((count, batch) => count + batch.events.length, 0);
}

function trimQueue(): void {
  let overflow = getQueuedEventCount() - MAX_QUEUE_SIZE;

  while (overflow > 0 && queue.length > 0) {
    const firstBatch = queue[0];
    if (firstBatch.events.length <= overflow) {
      overflow -= firstBatch.events.length;
      queue.shift();
      continue;
    }

    firstBatch.events.splice(0, overflow);
    overflow = 0;
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
