import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import {
  AdminInputError,
  listAdminProjects,
  ProjectInputSchema,
  uploadProjectCover,
  upsertProject
} from "@/lib/data/admin";

export const runtime = "nodejs";

export async function GET() {
  await requireAdmin();
  const projects = await listAdminProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  try {
    const input = await readProjectInput(request);
    const project = await upsertProject(input);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (isBadRequestError(error)) {
      return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
    }

    throw error;
  }
}

async function readProjectInput(request: NextRequest) {
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const formData = await request.formData();
    const input = ProjectInputSchema.parse(parseProjectFormData(formData));
    const coverFile = formData.get("cover");

    if (coverFile instanceof File) {
      const coverImageUrl = await uploadProjectCover(coverFile);
      if (coverImageUrl) {
        return { ...input, coverImageUrl };
      }
    }

    return input;
  }

  return ProjectInputSchema.parse(await request.json());
}

function parseProjectFormData(formData: FormData) {
  const payload = parseJsonPayload(formData.get("payload"));
  const tags = formData.getAll("tags").map(String).filter(Boolean);

  return {
    ...payload,
    title: getFormValue(formData, "title", payload.title),
    slug: getFormValue(formData, "slug", payload.slug),
    summary: getFormValue(formData, "summary", payload.summary),
    tags: tags.length > 0 ? tags : parseTags(getFormValue(formData, "tags", payload.tags)),
    demoUrl: getFormValue(formData, "demoUrl", payload.demoUrl),
    coverImageUrl: getFormValue(formData, "coverImageUrl", payload.coverImageUrl),
    contribution: getFormValue(formData, "contribution", payload.contribution),
    aiUsage: getFormValue(formData, "aiUsage", payload.aiUsage),
    decisions: getFormValue(formData, "decisions", payload.decisions),
    reflection: getFormValue(formData, "reflection", payload.reflection),
    prdMarkdown: getFormValue(formData, "prdMarkdown", payload.prdMarkdown),
    status: getFormValue(formData, "status", payload.status),
    isFeatured: parseBoolean(getFormValue(formData, "isFeatured", payload.isFeatured)),
    sortOrder: parseNumber(getFormValue(formData, "sortOrder", payload.sortOrder)),
    analyticsEnabled: parseBoolean(getFormValue(formData, "analyticsEnabled", payload.analyticsEnabled))
  };
}

function parseJsonPayload(value: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof value !== "string" || value.length === 0) return {};
  const parsed = JSON.parse(value);
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
}

function getFormValue(formData: FormData, key: string, fallback: unknown) {
  const value = formData.get(key);
  return value instanceof File || value === null ? fallback : value;
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return value;
}

function parseBoolean(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function parseNumber(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
}

function isBadRequestError(error: unknown) {
  return error instanceof z.ZodError || error instanceof SyntaxError || error instanceof AdminInputError;
}
