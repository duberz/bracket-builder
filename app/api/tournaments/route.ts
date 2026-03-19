import { NextResponse } from "next/server";

const TOURNAMENTS = [
  {
    id: "ncaa-basketball-2026",
    name: "2026 NCAA Men's Basketball Tournament",
    shortName: "March Madness 2026 — Men's",
    sport: "ncaa_basketball",
    season: "2025-26",
    teamCount: 64,
    logoUrl: null,
  },
  {
    id: "ncaa-womens-basketball-2026",
    name: "2026 NCAA Women's Basketball Tournament",
    shortName: "March Madness 2026 — Women's",
    sport: "ncaa_basketball",
    season: "2025-26",
    teamCount: 64,
    logoUrl: null,
  },
  {
    id: "fifa-world-cup-2026",
    name: "2026 FIFA World Cup",
    shortName: "FIFA World Cup 2026",
    sport: "soccer",
    season: "2026",
    teamCount: 48,
    logoUrl: null,
  },
  {
    id: "nfl-playoffs-2026",
    name: "2026 NFL Playoffs",
    shortName: "NFL Playoffs 2026",
    sport: "nfl_playoffs",
    season: "2025-26",
    teamCount: 14,
    logoUrl: null,
    comingSoon: true,
  },
  {
    id: "nba-playoffs-2026",
    name: "2026 NBA Playoffs",
    shortName: "NBA Playoffs 2026",
    sport: "nba_playoffs",
    season: "2025-26",
    teamCount: 16,
    logoUrl: null,
    comingSoon: true,
  },
  {
    id: "nhl-playoffs-2026",
    name: "2026 NHL Playoffs",
    shortName: "NHL Playoffs 2026",
    sport: "nhl_playoffs",
    season: "2025-26",
    teamCount: 16,
    logoUrl: null,
    comingSoon: true,
  },
];

export async function GET() {
  return NextResponse.json(TOURNAMENTS);
}
