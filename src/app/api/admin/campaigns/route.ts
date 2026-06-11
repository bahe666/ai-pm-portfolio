import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { CampaignInputSchema, createCampaign, listCampaigns } from "@/lib/data/admin";

export async function GET() {
  await requireAdmin();
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  try {
    const campaign = await createCampaign(CampaignInputSchema.parse(await request.json()));
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid campaign payload" }, { status: 400 });
    }

    throw error;
  }
}
