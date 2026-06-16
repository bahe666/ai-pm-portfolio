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

function shouldUsePublicFixtures() {
  return (
    process.env.PORTFOLIO_USE_FIXTURES === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export const getPublicProfile = cache(async (): Promise<Profile> => {
  if (shouldUsePublicFixtures()) {
    return fixtureProfile;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("profiles").select("*").limit(1).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return fixtureProfile;
  }

  return toProfile(data);
});

export const getPublishedProjects = cache(async (): Promise<Project[]> => {
  if (shouldUsePublicFixtures()) {
    return fixtureProjects;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(toProject);
});

export async function getPublishedProjectBySlug(slug: string) {
  const projects = await getPublishedProjects();
  return projects.find((project) => project.slug === slug) ?? null;
}
