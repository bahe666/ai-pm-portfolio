import { cache } from "react";
import { fixtureProfile, fixtureProjects } from "@/lib/fixtures";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile, Project } from "@/lib/types";

function toProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    displayName: String(row.display_name),
    title: String(row.title),
    headline: String(row.headline),
    intro: String(row.intro),
    contact: (row.contact ?? {}) as Record<string, string>,
    resumeSnapshot: (row.resume_snapshot ?? []) as string[],
    updatedAt: String(row.updated_at)
  };
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

export const getPublicProfile = cache(async (): Promise<Profile> => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("profiles").select("*").limit(1).single();
    if (error || !data) return fixtureProfile;
    return toProfile(data);
  } catch {
    return fixtureProfile;
  }
});

export const getPublishedProjects = cache(async (): Promise<Project[]> => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    if (error || !data) return fixtureProjects;
    return data.map(toProject);
  } catch {
    return fixtureProjects;
  }
});

export async function getPublishedProjectBySlug(slug: string) {
  const projects = await getPublishedProjects();
  return projects.find((project) => project.slug === slug) ?? null;
}
