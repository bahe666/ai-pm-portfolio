export const VISITOR_COOKIE_NAME = "portfolio_visitor";
export const SESSION_COOKIE_NAME = "portfolio_session";
export const CAMPAIGN_COOKIE_NAME = "portfolio_campaign";

export function createAnonymousId(): string {
  return `visitor_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function createSessionId(): string {
  return crypto.randomUUID();
}

export function getVisitorCookieName(): string {
  return VISITOR_COOKIE_NAME;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getCampaignCookieName(): string {
  return CAMPAIGN_COOKIE_NAME;
}
