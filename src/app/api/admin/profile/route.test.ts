import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: vi.fn()
}));

describe("PUT /api/admin/profile", () => {
  it("returns 400 for invalid profile payloads", async () => {
    const response = await PUT(
      new NextRequest("http://localhost/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          displayName: "",
          title: "",
          headline: "",
          intro: "",
          contact: {},
          resumeSnapshot: []
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid profile payload" });
  });
});
