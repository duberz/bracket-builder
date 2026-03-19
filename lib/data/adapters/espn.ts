/**
 * ESPN live bracket adapter — supports both Men's and Women's NCAA tournaments.
 *
 * Fetches from the ESPN public scoreboard API, normalises results, and merges
 * them onto a static matchup tree so the bracket reflects live scores/winners.
 */

import type { Tournament, Matchup, Team } from "@/types/bracket";
import mensStatic from "@/lib/data/static/ncaa-2026.json";
import womensStatic from "@/lib/data/static/ncaa-womens-2026.json";

const ESPN_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball";

const ESPN_TOURNAMENT_ID = 22;

interface SportConfig {
  sport: string;
  dates: string[];
}

const MENS: SportConfig = {
  sport: "mens-college-basketball",
  dates: [
    "20260317", "20260318", // First Four
    "20260319", "20260320", // First Round
    "20260321", "20260322", // Second Round
    "20260326", "20260327", // Sweet 16
    "20260328", "20260329", // Elite Eight
    "20260404", "20260405", // Final Four
    "20260407",             // Championship
  ],
};

const WOMENS: SportConfig = {
  sport: "womens-college-basketball",
  dates: [
    "20260318", "20260319", // First Four
    "20260320", "20260321", // First Round
    "20260322", "20260323", // Second Round
    "20260327", "20260328", // Sweet 16
    "20260329", "20260330", // Elite Eight
    "20260403",             // Final Four
    "20260405",             // Championship
  ],
};

// ── Headline parsers ──────────────────────────────────────────────────────────

// Women's 2026: ESPN uses "Regional N in City" — map to our region IDs by
// matching the 1-seed teams in each regional pod.
const WOMENS_REGIONAL_MAP: Record<string, string> = {
  "regional 1": "east",      // Fort Worth pod  — UConn region
  "regional 2": "west",      // Sacramento pod  — UCLA region
  "regional 3": "south",     // Fort Worth pod  — Texas region
  "regional 4": "midwest",   // Sacramento pod  — South Carolina region
};

function parseRegion(headline: string, regionIds: string[]): string | null {
  // Try men's standard region names first
  const stdMatch = headline.match(/(East|South|West|Midwest)\s+Region/i);
  if (stdMatch) return stdMatch[1].toLowerCase();

  // Women's 2026: "Regional N in City" format
  const wMatch = headline.match(/regional\s+(\d)/i);
  if (wMatch) {
    const key = `regional ${wMatch[1]}`;
    return WOMENS_REGIONAL_MAP[key] ?? null;
  }

  // Legacy: try matching against known region IDs
  for (const id of regionIds) {
    const city = id.replace(/\d+$/, "");
    if (headline.toLowerCase().includes(city.toLowerCase())) return id;
  }
  return null;
}

function parseRound(headline: string): number {
  if (/first\s+four/i.test(headline)) return -1;
  if (/1st\s+round/i.test(headline)) return 0;
  if (/2nd\s+round/i.test(headline)) return 1;
  if (/sweet\s+16|regional\s+semi/i.test(headline)) return 2;
  if (/elite\s+eight|regional\s+final/i.test(headline)) return 3;
  if (/final\s+four|national\s+semi/i.test(headline)) return 4;
  if (/national\s+championship/i.test(headline)) return 5;
  return -99;
}

// ── ESPN types ────────────────────────────────────────────────────────────────

interface EspnTeam {
  name: string;
  abbr: string;
  seed: number;
  score: number;
  winner: boolean;
  logoUrl: string;
}

interface EspnGame {
  id: string;
  round: number;
  region: string | null;
  home: EspnTeam;
  away: EspnTeam;
  completed: boolean;
  inProgress: boolean;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchAllGames(cfg: SportConfig, regionIds: string[]): Promise<EspnGame[]> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const dates = cfg.dates.filter((d) => d <= today);
  const url = `${ESPN_BASE}/${cfg.sport}/scoreboard`;
  const allGames: EspnGame[] = [];

  await Promise.all(
    dates.map(async (date) => {
      try {
        const res = await fetch(`${url}?limit=100&groups=100&dates=${date}`, {
          next: { revalidate: 60 },
        });
        if (!res.ok) return;
        const data = await res.json();

        for (const event of data.events ?? []) {
          const comp = event.competitions?.[0];
          if (!comp || comp.competitors?.length !== 2) continue;
          // tournamentId and notes moved to competition object in ESPN API update
          if ((comp.tournamentId ?? event.tournamentId) !== ESPN_TOURNAMENT_ID) continue;

          const headline: string =
            comp.notes?.[0]?.headline ?? event.notes?.[0]?.headline ?? "";
          const round = parseRound(headline);
          const region = parseRegion(headline, regionIds);

          const [c1, c2] = comp.competitors as any[];
          const state: string = event.status?.type?.state ?? "pre";

          const toTeam = (c: any): EspnTeam => ({
            name: c.team?.displayName ?? "",
            abbr: c.team?.abbreviation ?? "",
            seed: c.curatedRank?.current ?? 0,
            score: parseFloat(c.score ?? "0"),
            winner: c.winner ?? false,
            logoUrl: c.team?.logo ?? "",
          });

          allGames.push({
            id: event.id,
            round,
            region,
            home: toTeam(c1),
            away: toTeam(c2),
            completed: event.status?.type?.completed ?? false,
            inProgress: state === "in",
          });
        }
      } catch {
        // Silently skip failed date fetches
      }
    })
  );

  return allGames;
}

// ── Matching helpers ──────────────────────────────────────────────────────────

function setsEqual(a: Set<number>, b: Set<number>) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function resolveTeams(m: Matchup, winnerMap: Map<string, Team>): [Team | null, Team | null] {
  const teamA = m.teamA ?? (m.sourceMatchupIds[0] ? winnerMap.get(m.sourceMatchupIds[0]) ?? null : null);
  const teamB = m.teamB ?? (m.sourceMatchupIds[1] ? winnerMap.get(m.sourceMatchupIds[1]) ?? null : null);
  return [teamA, teamB];
}

// ── Core merge logic ──────────────────────────────────────────────────────────

async function buildLiveBracket(cfg: SportConfig, base: unknown): Promise<Tournament> {
  const tournament: Tournament = JSON.parse(JSON.stringify(base)) as Tournament;
  const matchups: Matchup[] = (tournament as any).matchups ?? [];
  const regionIds = tournament.regions.map((r) => r.id);

  let games: EspnGame[];
  try {
    games = await fetchAllGames(cfg, regionIds);
  } catch {
    return tournament; // fall back to static data
  }

  // ── Logo enrichment (runs on all games, including unplayed) ──
  const logoMap = new Map<string, string>();
  for (const g of games) {
    if (g.round === 0 && g.region) {
      if (g.home.logoUrl) logoMap.set(`${g.region}-${g.home.seed}`, g.home.logoUrl);
      if (g.away.logoUrl) logoMap.set(`${g.region}-${g.away.seed}`, g.away.logoUrl);
    }
  }
  for (const m of matchups) {
    if (m.round === 0 && m.region) {
      const a = m.teamA, b = m.teamB;
      if (a?.seed && !a.name.includes("/")) { const l = logoMap.get(`${m.region}-${a.seed}`); if (l) a.logoUrl = l; }
      if (b?.seed && !b.name.includes("/")) { const l = logoMap.get(`${m.region}-${b.seed}`); if (l) b.logoUrl = l; }
    }
  }

  // ── First Four resolution ──
  for (const game of games.filter((g) => g.round === -1 && g.completed)) {
    const winner = game.home.winner ? game.home : game.away;
    const r0 = matchups.find(
      (m) =>
        m.round === 0 &&
        (m.region === game.region || !game.region) &&
        (m.teamA?.seed === winner.seed || m.teamB?.seed === winner.seed) &&
        (m.teamA?.name.includes("/") || m.teamB?.name.includes("/") ||
         m.teamA?.name.includes("*") || m.teamB?.name.includes("*"))
    );
    if (!r0) continue;
    const newTeam: Team = {
      id: winner.abbr.toLowerCase(),
      name: winner.name,
      shortName: winner.abbr,
      abbreviation: winner.abbr,
      seed: winner.seed,
      record: "",
      region: game.region ?? undefined,
      logoUrl: winner.logoUrl || undefined,
    };
    if (r0.teamA?.name.includes("/") || r0.teamA?.name.includes("*")) r0.teamA = newTeam;
    else if (r0.teamB?.name.includes("/") || r0.teamB?.name.includes("*")) r0.teamB = newTeam;
  }

  // ── Round-by-round score/winner merge ──
  const winnerMap = new Map<string, Team>();

  for (let round = 0; round <= 5; round++) {
    const roundGames = games.filter((g) => g.round === round);
    const roundMatchups = matchups.filter((m) => m.round === round);

    for (const game of roundGames) {
      const gameSeedSet = new Set([game.home.seed, game.away.seed].filter(Boolean) as number[]);

      const match = roundMatchups.find((m) => {
        const [tA, tB] = resolveTeams(m, winnerMap);
        if (!tA || !tB) return false;
        const mSeedSet = new Set([tA.seed, tB.seed].filter(Boolean) as number[]);
        return (m.region === game.region || !game.region || round >= 4) && setsEqual(gameSeedSet, mSeedSet);
      });

      if (!match) continue;

      const [resolvedA, resolvedB] = resolveTeams(match, winnerMap);
      if (resolvedA) match.teamA = resolvedA;
      if (resolvedB) match.teamB = resolvedB;

      const homeIsA = match.teamA?.seed === game.home.seed;
      match.scoreA = homeIsA ? game.home.score : game.away.score;
      match.scoreB = homeIsA ? game.away.score : game.home.score;
      match.status = game.completed ? "final" : game.inProgress ? "in_progress" : "scheduled";

      if (game.completed) {
        const winner = game.home.winner ? game.home : game.away;
        const winnerTeam = winner.seed === match.teamA?.seed ? match.teamA : match.teamB;
        if (winnerTeam) {
          match.winner = winnerTeam;
          winnerMap.set(match.id, winnerTeam);
        }
      }
    }
  }

  (tournament as any).lastUpdated = new Date().toISOString();
  return tournament;
}

// ── Public exports ────────────────────────────────────────────────────────────

export function getLiveBracket(): Promise<Tournament> {
  return buildLiveBracket(MENS, mensStatic);
}

export function getLiveWomensBracket(): Promise<Tournament> {
  return buildLiveBracket(WOMENS, womensStatic);
}
