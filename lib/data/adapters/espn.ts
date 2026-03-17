/**
 * ESPN live bracket adapter for NCAA March Madness 2026.
 *
 * Fetches from the ESPN public scoreboard API, normalises the results,
 * and merges them onto the static ncaa-2026 matchup tree so the bracket
 * always reflects the latest scores / winners.
 */

import type { Tournament, Matchup, Team } from "@/types/bracket";
import staticData from "@/lib/data/static/ncaa-2026.json";

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";

const ESPN_TOURNAMENT_ID = 22; // NCAA Men's Basketball Championship

// Every date window that could have tournament games
const TOURNAMENT_DATES = [
  "20260317", "20260318", // First Four
  "20260319", "20260320", // First Round
  "20260321", "20260322", // Second Round
  "20260326", "20260327", // Sweet 16
  "20260328", "20260329", // Elite Eight
  "20260404", "20260405", // Final Four
  "20260407",             // Championship
];

// ── Headline parsers ──────────────────────────────────────────────────────────

function parseRegion(headline: string): string | null {
  const m = headline.match(/(East|South|West|Midwest)\s+Region/i);
  return m ? m[1].toLowerCase() : null;
}

function parseRound(headline: string): number {
  if (/first\s+four/i.test(headline)) return -1; // First Four
  if (/1st\s+round/i.test(headline)) return 0;
  if (/2nd\s+round/i.test(headline)) return 1;
  if (/sweet\s+16|regional\s+semi/i.test(headline)) return 2;
  if (/elite\s+eight|regional\s+final/i.test(headline)) return 3;
  if (/final\s+four|national\s+semi/i.test(headline)) return 4;
  if (/national\s+championship/i.test(headline)) return 5;
  return -99;
}

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

// ── Fetch all tournament games ────────────────────────────────────────────────

async function fetchAllGames(): Promise<EspnGame[]> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  // Only fetch dates up to and including today
  const dates = TOURNAMENT_DATES.filter((d) => d <= today);

  const allGames: EspnGame[] = [];

  await Promise.all(
    dates.map(async (date) => {
      try {
        const res = await fetch(`${ESPN_SCOREBOARD}?limit=100&groups=100&dates=${date}`, {
          next: { revalidate: 60 },
        });
        if (!res.ok) return;
        const data = await res.json();

        for (const event of data.events ?? []) {
          if (event.tournamentId !== ESPN_TOURNAMENT_ID) continue;

          const headline: string = event.notes?.[0]?.headline ?? "";
          const round = parseRound(headline);
          const region = parseRegion(headline);

          const comp = event.competitions?.[0];
          if (!comp || comp.competitors?.length !== 2) continue;

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
        // Silently skip failed date fetches — stale data beats a crash
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

/**
 * Resolve teamA/teamB for a matchup using a winner map built from
 * already-processed earlier rounds.
 */
function resolveTeams(
  m: Matchup,
  winnerMap: Map<string, Team>
): [Team | null, Team | null] {
  const teamA = m.teamA ?? (m.sourceMatchupIds[0] ? winnerMap.get(m.sourceMatchupIds[0]) ?? null : null);
  const teamB = m.teamB ?? (m.sourceMatchupIds[1] ? winnerMap.get(m.sourceMatchupIds[1]) ?? null : null);
  return [teamA, teamB];
}

// ── Main: merge ESPN results onto static data ─────────────────────────────────

export async function getLiveBracket(): Promise<Tournament> {
  // Deep-clone the static data so we can mutate safely
  const tournament: Tournament = JSON.parse(JSON.stringify(staticData)) as Tournament;
  const matchups: Matchup[] = (tournament as any).matchups ?? [];

  let games: EspnGame[];
  try {
    games = await fetchAllGames();
  } catch {
    // Return unmodified static data if ESPN is unreachable
    return tournament;
  }

  // winnerMap lets us resolve teams in later rounds as we go
  const winnerMap = new Map<string, Team>();

  // Process rounds 0–5 in order so resolved teams are available for each successive round
  for (let round = 0; round <= 5; round++) {
    const roundGames = games.filter((g) => g.round === round);
    const roundMatchups = matchups.filter((m) => m.round === round);

    for (const game of roundGames) {
      // Find which static matchup this game corresponds to by matching seed pairs
      const gameSeedSet = new Set([game.home.seed, game.away.seed].filter(Boolean));

      const match = roundMatchups.find((m) => {
        const [teamA, teamB] = resolveTeams(m, winnerMap);
        if (!teamA || !teamB) return false;
        const mSeedSet = new Set([teamA.seed, teamB.seed].filter(Boolean) as number[]);
        return (
          (m.region === game.region || round >= 4) &&
          setsEqual(gameSeedSet, mSeedSet)
        );
      });

      if (!match) continue;

      // Resolve teams for the matchup (fill in teamA/teamB from winnerMap if needed)
      const [resolvedA, resolvedB] = resolveTeams(match, winnerMap);
      if (resolvedA) match.teamA = resolvedA;
      if (resolvedB) match.teamB = resolvedB;

      // Apply score + status
      const homeIsA = match.teamA?.seed === game.home.seed;
      match.scoreA = homeIsA ? game.home.score : game.away.score;
      match.scoreB = homeIsA ? game.away.score : game.home.score;
      match.status = game.completed ? "final" : game.inProgress ? "in_progress" : "scheduled";

      // Apply winner
      if (game.completed) {
        const winner = game.home.winner ? game.home : game.away;
        const winnerTeam = winner.seed === match.teamA?.seed ? match.teamA : match.teamB;
        if (winnerTeam) {
          match.winner = winnerTeam;
          winnerMap.set(match.id, winnerTeam);
        }
      }
    }

    // Handle First Four: update placeholder teams in round 0
    if (round === -1) {
      for (const game of games.filter((g) => g.round === -1 && g.completed)) {
        const winner = game.home.winner ? game.home : game.away;
        // Find the round-0 matchup whose teamA or teamB is a First Four placeholder (name contains "/")
        const r0 = matchups.find(
          (m) =>
            m.round === 0 &&
            m.region === game.region &&
            (m.teamA?.seed === winner.seed || m.teamB?.seed === winner.seed) &&
            (m.teamA?.name.includes("/") || m.teamB?.name.includes("/"))
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
        };
        if (r0.teamA?.name.includes("/")) r0.teamA = newTeam;
        else if (r0.teamB?.name.includes("/")) r0.teamB = newTeam;
      }
    }
  }

  // Update lastUpdated
  (tournament as any).lastUpdated = new Date().toISOString();

  return tournament;
}
