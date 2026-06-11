import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { deleteProject, upsertProject } from "@/lib/data/admin";
import { isAdminProjectInputError, readAdminProjectInput } from "@/lib/data/admin-project-input";

export const runtime = "nodejs";

type ProjectRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: ProjectRouteContext) {
  await requireAdmin();
  const { id } = await params;

  try {
    const input = await readAdminProjectInput(request);
    const project = await upsertProject(input, id);
    return NextResponse.json({ project });
  } catch (error) {
    if (isAdminProjectInputError(error)) {
      return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
    }

    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: ProjectRouteContext) {
  await requireAdmin();
  const { id } = await params;
  await deleteProject(id);
  return NextResponse.json({ ok: true });
}
