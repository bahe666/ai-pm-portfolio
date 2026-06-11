import { NextRequest, NextResponse } from "next/server";
import { CAMPAIGN_COOKIE_NAME } from "@/lib/analytics/session";
import { fixtureCampaigns } from "@/lib/fixtures";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Campaign } from "@/lib/types";

const CAMPAIGN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type CampaignRouteContext = {
  params: Promise<{ campaignSlug: string }>;
};

export async function GET(request: NextRequest, { params }: CampaignRouteContext) {
  const { campaignSlug } = await params;
  const campaign = await findActiveCampaign(campaignSlug);
  const response = NextResponse.redirect(new URL("/", request.url));

  if (campaign) {
    response.cookies.set(CAMPAIGN_COOKIE_NAME, campaign.slug, {
      httpOnly: false,
      maxAge: CAMPAIGN_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax"
    });
  }

  return response;
}

async function findActiveCampaign(slug: string): Promise<Campaign | null> {
  if (shouldUseFixtureCampaigns()) {
    return findFixtureCampaign(slug);
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load campaign from Supabase", error);
      return null;
    }

    return data ? toCampaign(data) : null;
  } catch (error) {
    console.error("Supabase campaign lookup unavailable", error);
    return null;
  }
}

function shouldUseFixtureCampaigns(): boolean {
  return (
    process.env.PORTFOLIO_USE_FIXTURES === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function findFixtureCampaign(slug: string): Campaign | null {
  return fixtureCampaigns.find((campaign) => campaign.slug === slug && campaign.isActive) ?? null;
}

function toCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    company: String(row.company),
    role: String(row.role),
    jdUrl: row.jd_url ? String(row.jd_url) : null,
    jdSummary: row.jd_summary ? String(row.jd_summary) : null,
    tags: (row.tags ?? []) as string[],
    channel: String(row.channel),
    notes: row.notes ? String(row.notes) : null,
    slug: String(row.slug),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}
