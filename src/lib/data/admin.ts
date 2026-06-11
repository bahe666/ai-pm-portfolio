import { z } from "zod";
import type { Campaign, Project } from "@/lib/types";

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const LOCAL_COVER_PATTERN = /^\/covers\/[a-zA-Z0-9._/-]+\.(avif|gif|jpe?g|png|webp)$/;
const PROJECT_COVERS_BUCKET = "project-covers";
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const NullableStringSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().nullable().default(null)
);

const NullableUrlSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().url().nullable().default(null)
);

const CoverImageUrlSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z
    .union([z.string().url(), z.string().regex(LOCAL_COVER_PATTERN), z.null()])
    .default(null)
);

export const ProjectInputSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().regex(SLUG_PATTERN),
  summary: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).default([]),
  demoUrl: z.string().trim().url(),
  coverImageUrl: CoverImageUrlSchema,
  contribution: z.string().default(""),
  aiUsage: z.string().default(""),
  decisions: z.string().default(""),
  reflection: z.string().default(""),
  prdMarkdown: z.string().default(""),
  status: z.enum(["draft", "published", "hidden"]).default("draft"),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(100),
  analyticsEnabled: z.boolean().default(true)
});

export const CampaignInputSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  jdUrl: NullableUrlSchema,
  jdSummary: NullableStringSchema,
  tags: z.array(z.string().trim().min(1)).default([]),
  channel: z.string().trim().min(1).default("manual"),
  notes: NullableStringSchema,
  slug: z.string().trim().regex(SLUG_PATTERN),
  isActive: z.boolean().default(true)
});

export type ProjectInput = z.infer<typeof ProjectInputSchema>;
export type CampaignInput = z.infer<typeof CampaignInputSchema>;

export class AdminInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminInputError";
  }
}

export async function listAdminProjects(): Promise<Project[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toProject);
}

export async function upsertProject(input: ProjectInput, id?: string): Promise<Project> {
  const project = ProjectInputSchema.parse(input);
  const supabase = await createAdminClient();
  const row = toProjectRow(project);

  if (id) {
    const { data, error } = await supabase
      .from("projects")
      .update({
        ...row,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) throw error ?? new Error("Project update returned no row");
    return toProject(data);
  }

  const { data, error } = await supabase.from("projects").insert(row).select("*").single();
  if (error || !data) throw error ?? new Error("Project insert returned no row");
  return toProject(data);
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProjectCover(file: File): Promise<string | null> {
  if (file.size === 0) return null;

  if (!file.type.startsWith("image/")) {
    throw new AdminInputError("Project cover must be an image");
  }

  if (file.size > MAX_COVER_BYTES) {
    throw new AdminInputError("Project cover must be 5MB or smaller");
  }

  const supabase = await createAdminClient();
  const extension = getFileExtension(file.name);
  const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;
  const { data, error } = await supabase.storage.from(PROJECT_COVERS_BUCKET).upload(
    objectPath,
    Buffer.from(await file.arrayBuffer()),
    {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false
    }
  );

  if (error || !data) throw error ?? new Error("Project cover upload returned no path");

  return supabase.storage.from(PROJECT_COVERS_BUCKET).getPublicUrl(data.path).data.publicUrl;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toCampaign);
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const campaign = CampaignInputSchema.parse(input);
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert(toCampaignRow(campaign))
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Campaign insert returned no row");
  return toCampaign(data);
}

function toProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    summary: String(row.summary),
    tags: (row.tags ?? []) as string[],
    demoUrl: String(row.demo_url),
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : null,
    contribution: String(row.contribution ?? ""),
    aiUsage: String(row.ai_usage ?? ""),
    decisions: String(row.decisions ?? ""),
    reflection: String(row.reflection ?? ""),
    prdMarkdown: String(row.prd_markdown ?? ""),
    status: row.status as Project["status"],
    isFeatured: Boolean(row.is_featured),
    sortOrder: Number(row.sort_order),
    analyticsEnabled: Boolean(row.analytics_enabled),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

async function createAdminClient() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  return createSupabaseAdminClient();
}

function toProjectRow(project: ProjectInput) {
  return {
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    tags: project.tags,
    demo_url: project.demoUrl,
    cover_image_url: project.coverImageUrl,
    contribution: project.contribution,
    ai_usage: project.aiUsage,
    decisions: project.decisions,
    reflection: project.reflection,
    prd_markdown: project.prdMarkdown,
    status: project.status,
    is_featured: project.isFeatured,
    sort_order: project.sortOrder,
    analytics_enabled: project.analyticsEnabled
  };
}

function toCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    company: String(row.company),
    role: String(row.role),
    jdUrl: row.jd_url ? String(row.jd_url) : null,
    jdSummary: row.jd_summary ? String(row.jd_summary) : null,
    tags: (row.tags ?? []) as string[],
    channel: String(row.channel),
    notes: row.notes ? String(row.notes) : null,
    slug: String(row.slug),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function toCampaignRow(campaign: CampaignInput) {
  return {
    company: campaign.company,
    role: campaign.role,
    jd_url: campaign.jdUrl,
    jd_summary: campaign.jdSummary,
    tags: campaign.tags,
    channel: campaign.channel,
    notes: campaign.notes,
    slug: campaign.slug,
    is_active: campaign.isActive
  };
}

function getFileExtension(filename: string): string {
  const match = filename.match(/\.[a-zA-Z0-9]+$/);
  return match?.[0].toLowerCase() ?? "";
}
