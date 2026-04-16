import { NextRequest, NextResponse } from "next/server";
import { getLiveBracket, getLiveWomensBracket, getLiveNbaBracket } from "@/lib/data/adapters/espn";
import ncaa2026 from "@/lib/data/static/ncaa-2026.json";
import ncaaWomens2026 from "@/lib/data/static/ncaa-womens-2026.json";
import fifa2026 from "@/lib/data/static/fifa-2026.json";
import nba2026 from "@/lib/data/static/nba-2026.json";

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

  if (tournamentId === "fifa-world-cup-2026") {
    return NextResponse.json(fifa2026, { headers });
  }

  if (tournamentId === "nba-playoffs-2026") {
    try {
      return NextResponse.json(await getLiveNbaBracket(), { headers });
    } catch {
      return NextResponse.json(nba2026, { headers });
    }
  }

  return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
}
