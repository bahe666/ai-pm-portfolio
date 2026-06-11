import { z } from "zod";
import {
  AdminInputError,
  ProjectInputSchema,
  uploadProjectCover,
  type ProjectInput
} from "@/lib/data/admin";

export type ProjectCoverUploader = (file: File) => Promise<string | null>;

export async function readAdminProjectInput(
  request: Request,
  uploadCover: ProjectCoverUploader = uploadProjectCover
): Promise<ProjectInput> {
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    return parseAdminProjectFormData(await request.formData(), uploadCover);
  }

  return ProjectInputSchema.parse(await request.json());
}

export async function parseAdminProjectFormData(
  formData: FormData,
  uploadCover: ProjectCoverUploader = uploadProjectCover
): Promise<ProjectInput> {
  const input = ProjectInputSchema.parse(parseProjectFormDataFields(formData));
  const coverFile = getCoverFile(formData);

  if (!coverFile) {
    return input;
  }

  const coverImageUrl = await uploadCover(coverFile);
  return coverImageUrl ? { ...input, coverImageUrl } : input;
}

export function isAdminProjectInputError(error: unknown) {
  return error instanceof z.ZodError || error instanceof SyntaxError || error instanceof AdminInputError;
}

function parseProjectFormDataFields(formData: FormData) {
  const payload = parseJsonPayload(formData.get("payload"));

  return {
    ...payload,
    title: getFormValue(formData, "title", payload.title),
    slug: getFormValue(formData, "slug", payload.slug),
    summary: getFormValue(formData, "summary", payload.summary),
    tags: parseFormTags(formData, payload.tags),
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

function parseFormTags(formData: FormData, fallback: unknown) {
  const values = formData
    .getAll("tags")
    .filter((value): value is string => typeof value === "string")
    .filter(Boolean);

  if (values.length > 1) return values;
  if (values.length === 1) return parseTags(values[0]);

  return parseTags(fallback);
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
  if (value === "on" || value === "true") return true;
  if (value === "false") return false;
  return value;
}

function parseNumber(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
}

function getCoverFile(formData: FormData): File | null {
  const coverFile = formData.get("coverFile");
  if (coverFile instanceof File) return coverFile;

  const cover = formData.get("cover");
  return cover instanceof File ? cover : null;
}
