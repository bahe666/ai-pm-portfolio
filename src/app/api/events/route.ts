import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEventPayload, type EventPayload } from "@/lib/analytics/events";
import {
  CAMPAIGN_COOKIE_NAME,
  resolveAnonymousId,
  resolveSessionId,
  SESSION_COOKIE_NAME,
  VISITOR_COOKIE_NAME
} from "@/lib/analytics/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SESSION_COOKIE_MAX_AGE = 60 * 30;
const CAMPAIGN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const MAX_EVENTS_PER_REQUEST = 25;

type RequestAttribution = {
  campaignSlug: string | null;
  geoCity: string | null;
  geoCountry: string | null;
  geoRegion: string | null;
  ipAddress: string | null;
  referrer: string | null;
  sourceHint: string;
};

type EventIngestionJob = {
  anonymousId: string;
  attribution: RequestAttribution;
  events: EventPayload[];
  sessionId: string;
};

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if (!body.ok) {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const events = parseEvents(body.value);
  if (!events.ok) {
    return NextResponse.json({ ok: false, error: "Invalid event payload" }, { status: 400 });
  }

  const anonymousId = resolveAnonymousId(request.cookies.get(VISITOR_COOKIE_NAME)?.value);
  const sessionId = resolveSessionId(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const campaignSlug = request.cookies.get(CAMPAIGN_COOKIE_NAME)?.value ?? null;
  const attribution = getRequestAttribution(request, campaignSlug);
  const response = NextResponse.json({ ok: true });

  response.cookies.set(VISITOR_COOKIE_NAME, anonymousId, {
    httpOnly: false,
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax"
  });
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: false,
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax"
  });

  if (campaignSlug) {
    response.cookies.set(CAMPAIGN_COOKIE_NAME, campaignSlug, {
      httpOnly: false,
      maxAge: CAMPAIGN_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax"
    });
  }

  after(async () => {
    await ingestEvents({
      anonymousId,
      attribution,
      events: events.value,
      sessionId
    });
  });

  return response;
}

async function readJson(request: NextRequest): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}

function parseEvents(input: unknown): { ok: true; value: EventPayload[] } | { ok: false } {
  try {
    if (isRecord(input) && "events" in input && !Array.isArray(input.events)) {
      return { ok: false };
    }

    const rawEvents = isRecord(input) && Array.isArray(input.events) ? input.events : [input];
    if (rawEvents.length === 0 || rawEvents.length > MAX_EVENTS_PER_REQUEST) {
      return { ok: false };
    }

    return {
      ok: true,
      value: rawEvents.map((event) => normalizeEventPayload(event))
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false };
    }

    throw error;
  }
}

async function ingestEvents(job: EventIngestionJob): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data: visitor, error: visitorError } = await supabase
      .from("visitors")
      .upsert(
        {
          anonymous_id: job.anonymousId,
          last_seen_at: now
        },
        { onConflict: "anonymous_id" }
      )
      .select("id")
      .single();

    if (visitorError || !visitor) {
      throw visitorError ?? new Error("Visitor upsert returned no row");
    }

    const campaignId = await findCampaignId(supabase, job.attribution.campaignSlug);

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .upsert(
        {
          id: job.sessionId,
          visitor_id: visitor.id,
          campaign_id: campaignId,
          referrer: job.attribution.referrer,
          ip_address: job.attribution.ipAddress,
          geo_country: job.attribution.geoCountry,
          geo_region: job.attribution.geoRegion,
          geo_city: job.attribution.geoCity,
          source_hint: job.attribution.sourceHint
        },
        { onConflict: "id" }
      )
      .select("id")
      .single();

    if (sessionError || !session) {
      throw sessionError ?? new Error("Session upsert returned no row");
    }

    const { error: eventsError } = await supabase.from("events").insert(
      job.events.map((event) => ({
        session_id: session.id,
        visitor_id: visitor.id,
        campaign_id: campaignId,
        event_type: event.eventType,
        project_id: event.projectId ?? null,
        path: event.path,
        target_url: event.targetUrl ?? null,
        section_id: event.sectionId ?? null,
        duration_ms: event.durationMs ?? null,
        scroll_depth: event.scrollDepth ?? null,
        metadata: event.metadata
      }))
    );

    if (eventsError) {
      throw eventsError;
    }
  } catch (error) {
    console.error("Failed to ingest analytics events", error);
  }
}

async function findCampaignId(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  campaignSlug: string | null
): Promise<string | null> {
  if (!campaignSlug) {
    return null;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("id")
    .eq("slug", campaignSlug)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve analytics campaign", error);
    return null;
  }

  return data?.id ?? null;
}

function getRequestAttribution(request: NextRequest, campaignSlug: string | null): RequestAttribution {
  const referrer = request.headers.get("referer");
  const geoCountry = request.headers.get("x-vercel-ip-country");
  const geoRegion = request.headers.get("x-vercel-ip-country-region");
  const geoCity = request.headers.get("x-vercel-ip-city");

  return {
    campaignSlug,
    geoCity,
    geoCountry,
    geoRegion,
    ipAddress: getIpAddress(request),
    referrer,
    sourceHint: getSourceHint(campaignSlug, referrer)
  };
}

function getIpAddress(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

function getSourceHint(campaignSlug: string | null, referrer: string | null): string {
  if (campaignSlug) {
    return "campaign_cookie";
  }

  if (referrer) {
    return "referrer";
  }

  return "direct";
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
