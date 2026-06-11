export const VISITOR_COOKIE_NAME = "portfolio_visitor";
export const SESSION_COOKIE_NAME = "portfolio_session";
export const CAMPAIGN_COOKIE_NAME = "portfolio_campaign";

const ANONYMOUS_ID_PATTERN = /^visitor_[A-Za-z0-9_-]+$/;
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function isValidAnonymousId(value: string | undefined | null): value is string {
  return typeof value === "string" && ANONYMOUS_ID_PATTERN.test(value);
}

export function isValidSessionId(value: string | undefined | null): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value);
}

export function resolveAnonymousId(value: string | undefined | null): string {
  return isValidAnonymousId(value) ? value : createAnonymousId();
}

export function resolveSessionId(value: string | undefined | null): string {
  return isValidSessionId(value) ? value : createSessionId();
}
