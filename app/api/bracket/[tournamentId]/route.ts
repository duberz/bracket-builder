import { NextRequest, NextResponse } from "next/server";
import ncaa2026 from "@/lib/data/static/ncaa-2026.json";

// Registry of available static tournaments
const STATIC_DATA: Record<string, unknown> = {
  "ncaa-basketball-2026": ncaa2026,
};

export const runtime = "edge";
export const revalidate = 60;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await context.params;
  const data = STATIC_DATA[tournamentId];

  if (!data) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
