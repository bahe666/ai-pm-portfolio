import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: noStoreHeaders() }
      );
    }
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("visitors").select("id", {
    count: "exact",
    head: true
  });

  if (error) {
    console.error("Supabase heartbeat failed", error);
    return Response.json(
      { ok: false, error: "supabase_heartbeat_failed" },
      { status: 503, headers: noStoreHeaders() }
    );
  }

  return Response.json(
    { ok: true, checkedAt: new Date().toISOString() },
    { headers: noStoreHeaders() }
  );
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store"
  };
}
