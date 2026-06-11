import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignInputSchema, ProfileInputSchema, ProjectInputSchema, uploadProjectCover } from "./admin";
import { parseAdminProjectFormData } from "./admin-project-input";

const supabaseMocks = vi.hoisted(() => {
  const upload = vi.fn();
  const getPublicUrl = vi.fn();
  const from = vi.fn(() => ({
    getPublicUrl,
    upload
  }));

  return {
    client: {
      storage: {
        from
      }
    },
    from,
    getPublicUrl,
    upload
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => supabaseMocks.client
}));

beforeEach(() => {
  supabaseMocks.from.mockClear();
  supabaseMocks.getPublicUrl.mockReset();
  supabaseMocks.upload.mockReset();
});

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

  it("rejects path traversal in a local cover path", () => {
    expect(() =>
      ProjectInputSchema.parse({
        title: "Agent collaboration",
        slug: "agent-collaboration",
        summary: "A concise project summary.",
        tags: [],
        demoUrl: "https://example.com/demo",
        coverImageUrl: "/covers/../../secret.png"
      })
    ).toThrow();
  });

  it("rejects local cover subdirectories", () => {
    expect(() =>
      ProjectInputSchema.parse({
        title: "Agent collaboration",
        slug: "agent-collaboration",
        summary: "A concise project summary.",
        tags: [],
        demoUrl: "https://example.com/demo",
        coverImageUrl: "/covers/archive/secret.png"
      })
    ).toThrow();
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

describe("uploadProjectCover", () => {
  it("rejects svg uploads", async () => {
    const file = new File(["<svg />"], "cover.svg", { type: "image/svg+xml" });

    await expect(uploadProjectCover(file)).rejects.toThrow("Project cover must be a raster image");
    expect(supabaseMocks.upload).not.toHaveBeenCalled();
  });

  it("uses the MIME-derived extension for png uploads", async () => {
    const file = new File(["png"], "cover.svg", { type: "image/png" });
    supabaseMocks.upload.mockResolvedValue({
      data: { path: "2026-06-11/mock-id.png" },
      error: null
    });
    supabaseMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/project-covers/mock-id.png" }
    });

    await expect(uploadProjectCover(file)).resolves.toContain("mock-id.png");

    const [objectPath, , options] = supabaseMocks.upload.mock.calls[0];
    expect(objectPath).toMatch(/\.png$/);
    expect(objectPath).not.toMatch(/\.svg$/);
    expect(options).toMatchObject({ contentType: "image/png" });
  });
});

describe("parseAdminProjectFormData", () => {
  it("accepts coverFile and checkbox values from multipart forms", async () => {
    const coverFile = new File(["png"], "cover.png", { type: "image/png" });
    const upload = vi.fn().mockResolvedValue("https://cdn.example.com/project-cover.png");
    const formData = new FormData();

    formData.set("title", "Workflow demo");
    formData.set("slug", "workflow-demo");
    formData.set("summary", "A concise project summary.");
    formData.set("tags", "AI,Workflow");
    formData.set("demoUrl", "https://example.com/demo");
    formData.set("isFeatured", "on");
    formData.set("sortOrder", "5");
    formData.set("coverFile", coverFile);

    const project = await parseAdminProjectFormData(formData, upload);

    expect(project).toMatchObject({
      analyticsEnabled: true,
      coverImageUrl: "https://cdn.example.com/project-cover.png",
      isFeatured: true,
      sortOrder: 5,
      tags: ["AI", "Workflow"]
    });
    expect(upload).toHaveBeenCalledWith(coverFile);
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

describe("ProfileInputSchema", () => {
  it("accepts the editable public profile fields", () => {
    const profile = ProfileInputSchema.parse({
      displayName: "你的姓名",
      title: "AI 产品经理实习生候选人",
      headline: "用 Demo 讲清楚产品判断。",
      intro: "整理 AI 产品原型、PRD 和项目思考。",
      contact: {
        email: "you@example.com",
        website: "https://example.com"
      },
      resumeSnapshot: ["参与团队工作流 AI 化转型", "沉淀 PRD 和原型 Demo"]
    });

    expect(profile).toMatchObject({
      contact: {
        email: "you@example.com",
        website: "https://example.com"
      },
      resumeSnapshot: ["参与团队工作流 AI 化转型", "沉淀 PRD 和原型 Demo"]
    });
  });

  it("rejects empty resume snapshot bullets", () => {
    expect(() =>
      ProfileInputSchema.parse({
        displayName: "你的姓名",
        title: "AI 产品经理实习生候选人",
        headline: "用 Demo 讲清楚产品判断。",
        intro: "整理 AI 产品原型、PRD 和项目思考。",
        contact: {},
        resumeSnapshot: [""]
      })
    ).toThrow();
  });
});
