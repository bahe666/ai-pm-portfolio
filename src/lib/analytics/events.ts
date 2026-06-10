import { z } from "zod";

import { EVENT_TYPES } from "../types";

export const EventTypeSchema = z.enum(EVENT_TYPES);

const MetadataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .superRefine((value, ctx) => {
    for (const blockedKey of ["browser", "os", "language", "screenWidth", "screenHeight"]) {
      if (blockedKey in value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `metadata.${blockedKey} is not collected in v1`
        });
      }
    }
  });

export const EventPayloadSchema = z.object({
  eventType: EventTypeSchema,
  path: z.string().min(1).max(512),
  projectId: z.string().uuid().optional(),
  targetUrl: z.string().url().optional(),
  sectionId: z.string().min(1).max(120).optional(),
  durationMs: z.number().int().min(0).max(600_000).optional(),
  scrollDepth: z.number().min(0).max(100).optional(),
  metadata: MetadataSchema.default({})
});

export type EventPayload = z.infer<typeof EventPayloadSchema>;

export function normalizeEventPayload(input: unknown): EventPayload {
  const parsed = EventPayloadSchema.parse(clampDuration(input));

  return {
    ...parsed,
    metadata: parsed.metadata ?? {}
  };
}

function clampDuration(input: unknown): unknown {
  if (!isRecord(input) || typeof input.durationMs !== "number") {
    return input;
  }

  if (!Number.isFinite(input.durationMs) || !Number.isInteger(input.durationMs) || input.durationMs < 0) {
    return input;
  }

  return {
    ...input,
    durationMs: Math.min(input.durationMs, 600_000)
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
