import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAnalyticsDashboard } from "@/lib/data/analytics";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BACKUP_TABLES = {
  profiles: "id,display_name,title,headline,intro,contact,resume_snapshot,updated_at",
  projects:
    "id,title,slug,summary,tags,demo_url,cover_image_url,contribution,ai_usage,decisions,reflection,prd_markdown,status,is_featured,sort_order,analytics_enabled,created_at,updated_at",
  campaigns: "id,company,role,jd_url,jd_summary,tags,channel,notes,slug,is_active,created_at,updated_at",
  visitors: "id,anonymous_id,first_seen_at,last_seen_at",
  sessions: "id,visitor_id,campaign_id,referrer,geo_country,geo_region,geo_city,source_hint,started_at,ended_at",
  events:
    "id,session_id,visitor_id,campaign_id,event_type,project_id,path,target_url,section_id,duration_ms,scroll_depth,metadata,occurred_at"
} as const;

export async function GET() {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const [entries, analyticsSummary] = await Promise.all([
    Promise.all(
      Object.entries(BACKUP_TABLES).map(async ([table, columns]) => {
        const { data, error } = await supabase.from(table).select(columns);
        if (error) throw error;
        return [table, (data ?? []).map(removeSensitiveFields)] as const;
      })
    ),
    getAnalyticsDashboard()
  ]);

  const exportedAt = new Date().toISOString();
  const filename = `portfolio-backup-${exportedAt.slice(0, 10)}.json`;

  return NextResponse.json(
    {
      exportedAt,
      analyticsSummary,
      ...Object.fromEntries(entries)
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    }
  );
}

function removeSensitiveFields(row: unknown) {
  if (!isRecord(row)) return row;
  const safeRow = { ...row };
  delete safeRow.ip_address;
  return safeRow;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
