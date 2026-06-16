import { NextRequest, NextResponse } from "next/server";
import { CAMPAIGN_COOKIE_NAME } from "@/lib/analytics/session";

const CAMPAIGN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function proxy(request: NextRequest) {
  const campaignSlug = request.nextUrl.pathname.split("/").filter(Boolean)[1];

  if (!campaignSlug) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";

  const response = NextResponse.rewrite(url);

  response.cookies.set(CAMPAIGN_COOKIE_NAME, campaignSlug, {
    httpOnly: false,
    maxAge: CAMPAIGN_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax"
  });

  return response;
}

export const config = {
  matcher: "/v/:campaignSlug"
};
