import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?message=auth-error", request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/login?message=auth-error", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login?message=login-unavailable", request.url));
  }

  return NextResponse.redirect(new URL("/admin", request.url));
}
