import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_COOKIE_NAME,
  createAnonymousId,
  createSessionId,
  getCampaignCookieName,
  getSessionCookieName,
  getVisitorCookieName,
  isValidAnonymousId,
  isValidSessionId,
  resolveAnonymousId,
  resolveSessionId,
  SESSION_COOKIE_NAME,
  VISITOR_COOKIE_NAME
} from "./session";

describe("analytics session helpers", () => {
  it("creates anonymous visitor ids with the expected prefix", () => {
    const id = createAnonymousId();

    expect(id).toMatch(/^visitor_[A-Za-z0-9_-]+$/);
    expect(createAnonymousId()).not.toBe(id);
  });

  it("creates UUID session ids that can be stored in the sessions table", () => {
    const id = createSessionId();

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(createSessionId()).not.toBe(id);
  });

  it("exposes stable analytics cookie names", () => {
    expect(VISITOR_COOKIE_NAME).toBe("portfolio_visitor");
    expect(SESSION_COOKIE_NAME).toBe("portfolio_session");
    expect(CAMPAIGN_COOKIE_NAME).toBe("portfolio_campaign");
    expect(getVisitorCookieName()).toBe("portfolio_visitor");
    expect(getSessionCookieName()).toBe("portfolio_session");
    expect(getCampaignCookieName()).toBe("portfolio_campaign");
  });

  it("validates and resolves anonymous visitor ids", () => {
    const validId = "visitor_0123456789abcdef";

    expect(isValidAnonymousId(validId)).toBe(true);
    expect(isValidAnonymousId("bad_0123456789abcdef")).toBe(false);
    expect(isValidAnonymousId("visitor_")).toBe(false);
    expect(resolveAnonymousId(validId)).toBe(validId);
    expect(resolveAnonymousId("not-a-visitor")).toMatch(/^visitor_[A-Za-z0-9_-]+$/);
  });

  it("validates and resolves session UUIDs", () => {
    const validId = "11111111-1111-4111-8111-111111111111";

    expect(isValidSessionId(validId)).toBe(true);
    expect(isValidSessionId("visitor_0123456789abcdef")).toBe(false);
    expect(resolveSessionId(validId)).toBe(validId);
    expect(resolveSessionId("not-a-uuid")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
