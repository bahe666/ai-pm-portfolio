export type ProjectStatus = "draft" | "published" | "hidden";

export type Profile = {
  id: string;
  displayName: string;
  title: string;
  headline: string;
  intro: string;
  contact: Record<string, string>;
  resumeSnapshot: string[];
  updatedAt: string;
};

export type Project = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  tags: string[];
  demoUrl: string;
  coverImageUrl: string | null;
  contribution: string;
  aiUsage: string;
  decisions: string;
  reflection: string;
  prdMarkdown: string;
  status: ProjectStatus;
  isFeatured: boolean;
  sortOrder: number;
  analyticsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Campaign = {
  id: string;
  company: string;
  role: string;
  jdUrl: string | null;
  jdSummary: string | null;
  tags: string[];
  channel: string;
  notes: string | null;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const EVENT_TYPES = [
  "page_view",
  "session_start",
  "session_end",
  "project_impression",
  "project_expand",
  "project_detail_view",
  "prd_summary_expand",
  "prd_full_view",
  "prd_section_view",
  "section_dwell",
  "demo_click",
  "external_link_click",
  "resume_snapshot_view"
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
