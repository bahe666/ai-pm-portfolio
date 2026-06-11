import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { updateProfile } from "@/lib/data/admin";

export async function PUT(request: NextRequest) {
  await requireAdmin();

  try {
    const profile = await updateProfile(await request.json());
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
    }

    throw error;
  }
}
