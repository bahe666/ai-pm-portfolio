import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminProjects, upsertProject } from "@/lib/data/admin";
import { isAdminProjectInputError, readAdminProjectInput } from "@/lib/data/admin-project-input";

export const runtime = "nodejs";

export async function GET() {
  await requireAdmin();
  const projects = await listAdminProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  try {
    const input = await readAdminProjectInput(request);
    const project = await upsertProject(input);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (isAdminProjectInputError(error)) {
      return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
    }

    throw error;
  }
}
