import { describe, expect, it } from "vitest";
import { CampaignInputSchema, ProjectInputSchema } from "./admin";

describe("ProjectInputSchema", () => {
  it("applies admin project defaults", () => {
    const project = ProjectInputSchema.parse({
      title: "Workflow demo",
      slug: "workflow-demo",
      summary: "A concise project summary.",
      tags: ["AI", "Workflow"],
      demoUrl: "https://example.com/demo"
    });

    expect(project).toMatchObject({
      analyticsEnabled: true,
      aiUsage: "",
      contribution: "",
      coverImageUrl: null,
      decisions: "",
      isFeatured: false,
      prdMarkdown: "",
      reflection: "",
      sortOrder: 100,
      status: "draft"
    });
  });

  it("accepts a local public cover path", () => {
    const project = ProjectInputSchema.parse({
      title: "Agent collaboration",
      slug: "agent-collaboration",
      summary: "A concise project summary.",
      tags: [],
      demoUrl: "https://example.com/demo",
      coverImageUrl: "/covers/agent-collaboration-prototype.png"
    });

    expect(project.coverImageUrl).toBe("/covers/agent-collaboration-prototype.png");
  });

  it("accepts a nullable cover image URL", () => {
    const project = ProjectInputSchema.parse({
      title: "Agent collaboration",
      slug: "agent-collaboration",
      summary: "A concise project summary.",
      tags: [],
      demoUrl: "https://example.com/demo",
      coverImageUrl: null
    });

    expect(project.coverImageUrl).toBeNull();
  });

  it("requires a lowercase slug with dashes", () => {
    expect(() =>
      ProjectInputSchema.parse({
        title: "Workflow demo",
        slug: "Workflow Demo",
        summary: "A concise project summary.",
        tags: [],
        demoUrl: "https://example.com/demo"
      })
    ).toThrow();
  });

  it("requires demoUrl to be an absolute URL", () => {
    expect(() =>
      ProjectInputSchema.parse({
        title: "Workflow demo",
        slug: "workflow-demo",
        summary: "A concise project summary.",
        tags: [],
        demoUrl: "/demo"
      })
    ).toThrow();
  });
});

describe("CampaignInputSchema", () => {
  it("applies campaign defaults", () => {
    const campaign = CampaignInputSchema.parse({
      company: "Example Co",
      role: "AI PM Intern",
      tags: ["AI"],
      slug: "example-ai-pm"
    });

    expect(campaign).toMatchObject({
      channel: "manual",
      isActive: true,
      jdSummary: null,
      jdUrl: null,
      notes: null
    });
  });

  it("normalizes an empty jdUrl to null", () => {
    const campaign = CampaignInputSchema.parse({
      company: "Example Co",
      role: "AI PM Intern",
      jdUrl: "",
      tags: [],
      slug: "example-ai-pm"
    });

    expect(campaign.jdUrl).toBeNull();
  });

  it("accepts an absolute jdUrl", () => {
    const campaign = CampaignInputSchema.parse({
      company: "Example Co",
      role: "AI PM Intern",
      jdUrl: "https://example.com/jobs/ai-pm",
      tags: [],
      slug: "example-ai-pm"
    });

    expect(campaign.jdUrl).toBe("https://example.com/jobs/ai-pm");
  });

  it("requires a lowercase slug with dashes", () => {
    expect(() =>
      CampaignInputSchema.parse({
        company: "Example Co",
        role: "AI PM Intern",
        tags: [],
        slug: "Example AI PM"
      })
    ).toThrow();
  });
});
