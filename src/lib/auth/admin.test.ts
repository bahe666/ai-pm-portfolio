import { describe, expect, it } from "vitest";
import { isAllowedAdminEmail } from "./admin";

describe("isAllowedAdminEmail", () => {
  it("accepts an email in ADMIN_EMAILS", () => {
    expect(isAllowedAdminEmail("YOU@example.com", ["you@example.com"])).toBe(true);
  });

  it("rejects an email outside ADMIN_EMAILS", () => {
    expect(isAllowedAdminEmail("other@example.com", ["you@example.com"])).toBe(false);
  });
});
