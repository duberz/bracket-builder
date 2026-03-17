import { NextRequest, NextResponse } from "next/server";
import { getLiveBracket, getLiveWomensBracket } from "@/lib/data/adapters/espn";
import ncaa2026 from "@/lib/data/static/ncaa-2026.json";
import ncaaWomens2026 from "@/lib/data/static/ncaa-womens-2026.json";

export const revalidate = 60;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await context.params;
  const headers = { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" };

  if (tournamentId === "ncaa-basketball-2026") {
    try {
      return NextResponse.json(await getLiveBracket(), { headers });
    } catch {
      return NextResponse.json(ncaa2026, { headers });
    }
  }

  if (tournamentId === "ncaa-womens-basketball-2026") {
    try {
      return NextResponse.json(await getLiveWomensBracket(), { headers });
    } catch {
      return NextResponse.json(ncaaWomens2026, { headers });
    }
  }

  return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
}
