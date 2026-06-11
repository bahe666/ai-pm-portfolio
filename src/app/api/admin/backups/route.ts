import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BACKUP_TABLES = ["profiles", "projects", "campaigns", "sessions", "events"] as const;

export async function GET() {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const entries = await Promise.all(
    BACKUP_TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      return [table, data ?? []] as const;
    })
  );

  const exportedAt = new Date().toISOString();
  const filename = `portfolio-backup-${exportedAt.slice(0, 10)}.json`;

  return NextResponse.json(
    {
      exportedAt,
      tables: Object.fromEntries(entries)
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    }
  );
}
