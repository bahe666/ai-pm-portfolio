import { describe, expect, it } from "vitest";

describe("test environment", () => {
  it("runs with a JSDOM document", () => {
    expect(document.createElement("main").tagName).toBe("MAIN");
  });
});
