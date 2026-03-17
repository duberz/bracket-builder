import { NextRequest, NextResponse } from "next/server";
import { getLiveBracket } from "@/lib/data/adapters/espn";
import ncaa2026 from "@/lib/data/static/ncaa-2026.json";

// Revalidate via Next.js ISR every 60 s
export const revalidate = 60;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await context.params;

  if (tournamentId !== "ncaa-basketball-2026") {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  try {
    const data = await getLiveBracket();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    // Fall back to static data if ESPN is unreachable
    return NextResponse.json(ncaa2026, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  }
}
