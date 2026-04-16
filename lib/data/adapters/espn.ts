/**
 * ESPN live bracket adapter — supports NCAA (Men's/Women's) and NBA playoffs.
 *
 * Fetches from the ESPN public scoreboard API, normalises results, and merges
 * them onto a static matchup tree so the bracket reflects live scores/winners.
 */

import type { Tournament, Matchup, Team } from "@/types/bracket";
import mensStatic from "@/lib/data/static/ncaa-2026.json";
import womensStatic from "@/lib/data/static/ncaa-womens-2026.json";
import nbaStatic from "@/lib/data/static/nba-2026.json";

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

// ── Public exports (NCAA) ─────────────────────────────────────────────────────

export function getLiveBracket(): Promise<Tournament> {
  return buildLiveBracket(MENS, mensStatic);
}

export function getLiveWomensBracket(): Promise<Tournament> {
  return buildLiveBracket(WOMENS, womensStatic);
}

// ── NBA Playoffs adapter ──────────────────────────────────────────────────────

function generateDateRange(startIso: string, endIso: string): string[] {
  const dates: string[] = [];
  const cur = new Date(startIso);
  const end = new Date(endIso);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10).replace(/-/g, ""));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const NBA_PLAYOFF_DATES = generateDateRange("2026-04-19", "2026-06-22");

interface NbaGame {
  round: number;
  conference: string | null;
  homeSeed: number;
  awaySeed: number;
  homeTeam: Team;
  awayTeam: Team;
  homeWon: boolean | null;
  inProgress: boolean;
}

// ESPN uses "East 1st Round" / "West Conf Semis" etc. (not "Eastern Conference First Round")
function parseNbaRound(headline: string): number {
  if (/1st\s+round|first\s+round/i.test(headline)) return 1;
  if (/semi.?final|conf.+semi/i.test(headline)) return 2;
  if (/conf.+final/i.test(headline)) return 3;
  if (/nba\s+final/i.test(headline)) return 4;
  return -99;
}

function parseNbaConference(headline: string): string | null {
  if (/^east/i.test(headline) || /eastern/i.test(headline)) return "east";
  if (/^west/i.test(headline) || /western/i.test(headline)) return "west";
  return null;
}

// Fetch playoff seeds from ESPN standings (seeds not included in scoreboard API)
async function fetchNbaSeedMap(): Promise<Map<string, { seed: number; conf: "east" | "west" }>> {
  const map = new Map<string, { seed: number; conf: "east" | "west" }>();

  await Promise.all(
    ([
      { group: 5, conf: "east" as const },
      { group: 6, conf: "west" as const },
    ] as const).map(async ({ group, conf }) => {
      try {
        const url =
          `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings` +
          `?season=2026&seasontype=2&group=${group}&sort=wins:desc,gamesBehind:asc&level=3`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) return;
        const data = await res.json();
        for (const child of data.children ?? []) {
          for (const entry of child.standings?.entries ?? []) {
            const seedStat = (entry.stats as any[] | undefined)?.find(
              (s) => s.name === "playoffSeed"
            );
            if (!seedStat) continue;
            const seed = Number(seedStat.value);
            if (seed < 1 || seed > 10) continue;
            const abbr: string = entry.team?.abbreviation ?? "";
            if (abbr) map.set(abbr, { seed, conf });
          }
        }
      } catch {
        // ignore standings fetch failure — seeds will be 0 and teams may not render
      }
    })
  );

  return map;
}

async function fetchNbaPlayoffGames(): Promise<NbaGame[]> {
  // Fetch up to 7 days ahead so scheduled (pre-game) matchups populate teams
  const lookAhead = new Date();
  lookAhead.setDate(lookAhead.getDate() + 7);
  const cutoff = lookAhead.toISOString().slice(0, 10).replace(/-/g, "");
  const dates = NBA_PLAYOFF_DATES.filter((d) => d <= cutoff);
  if (dates.length === 0) return [];

  const url = `${ESPN_BASE}/nba/scoreboard`;
  const allGames: NbaGame[] = [];

  await Promise.all(
    dates.map(async (date) => {
      try {
        const res = await fetch(`${url}?seasontype=3&limit=100&dates=${date}`, {
          next: { revalidate: 60 },
        });
        if (!res.ok) return;
        const data = await res.json();

        for (const event of data.events ?? []) {
          const comp = event.competitions?.[0];
          if (!comp || comp.competitors?.length !== 2) continue;

          const headline: string =
            comp.notes?.[0]?.headline ?? event.notes?.[0]?.headline ?? "";

          if (/play.?in/i.test(headline)) continue;

          const round = parseNbaRound(headline);
          if (round === -99) continue;

          const conference = parseNbaConference(headline);
          const state: string = event.status?.type?.state ?? "pre";
          const completed: boolean = event.status?.type?.completed ?? false;

          const [c1, c2] = comp.competitors as any[];
          const home = c1.homeAway === "home" ? c1 : c2;
          const away = c1.homeAway === "home" ? c2 : c1;

          const toTeam = (c: any): Team => ({
            id: c.team?.abbreviation?.toLowerCase() ?? "",
            name: c.team?.displayName ?? c.team?.shortDisplayName ?? "",
            shortName: c.team?.shortDisplayName ?? c.team?.abbreviation ?? "",
            abbreviation: c.team?.abbreviation ?? "",
            seed: 0, // enriched from seed map in buildNbaLiveBracket
            logoUrl: c.team?.logo ?? undefined,
            region: conference ?? undefined,
          });

          allGames.push({
            round,
            conference,
            homeSeed: 0, // enriched below
            awaySeed: 0,
            homeTeam: toTeam(home),
            awayTeam: toTeam(away),
            homeWon: completed ? (home.winner ?? false) : null,
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

const NBA_R1_POSITION: Record<string, number> = {
  "1v8": 0, "8v1": 0,
  "4v5": 1, "5v4": 1,
  "3v6": 2, "6v3": 2,
  "2v7": 3, "7v2": 3,
};

async function buildNbaLiveBracket(base: unknown): Promise<Tournament> {
  const tournament: Tournament = JSON.parse(JSON.stringify(base)) as Tournament;
  const matchups: Matchup[] = (tournament as any).matchups ?? [];

  let games: NbaGame[];
  let seedMap: Map<string, { seed: number; conf: "east" | "west" }>;
  try {
    [games, seedMap] = await Promise.all([fetchNbaPlayoffGames(), fetchNbaSeedMap()]);
  } catch {
    return tournament;
  }
  if (games.length === 0) return tournament;

  // Enrich games with seeds from standings (scoreboard API doesn't include seeds for NBA)
  for (const g of games) {
    const homeSeed = seedMap.get(g.homeTeam.abbreviation)?.seed ?? 0;
    const awayIsTbd = g.awayTeam.abbreviation.includes("/");
    // In round 1, away seed = 9 - home seed (NBA bracket: 1v8, 2v7, 3v6, 4v5)
    const awaySeed = awayIsTbd
      ? (g.round === 1 ? 9 - homeSeed : 0)
      : (seedMap.get(g.awayTeam.abbreviation)?.seed ?? 0);
    g.homeSeed = homeSeed;
    g.awaySeed = awaySeed;
    g.homeTeam = { ...g.homeTeam, seed: homeSeed };
    g.awayTeam = { ...g.awayTeam, seed: awaySeed };
  }

  interface SeriesData {
    lowerSeedTeam: Team;
    higherSeedTeam: Team;
    lowerWins: number;
    higherWins: number;
    hasInProgress: boolean;
  }

  const seriesMap = new Map<string, SeriesData>();

  for (const g of games) {
    if (g.homeSeed === 0 || g.awaySeed === 0) continue;
    const lo = Math.min(g.homeSeed, g.awaySeed);
    const hi = Math.max(g.homeSeed, g.awaySeed);
    const conf = g.conference ?? "finals";
    const key = `${conf}_r${g.round}_${lo}v${hi}`;

    const loTeam = g.homeSeed <= g.awaySeed ? g.homeTeam : g.awayTeam;
    const hiTeam = g.homeSeed <= g.awaySeed ? g.awayTeam : g.homeTeam;

    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        lowerSeedTeam: { ...loTeam },
        higherSeedTeam: { ...hiTeam },
        lowerWins: 0,
        higherWins: 0,
        hasInProgress: false,
      });
    }

    const s = seriesMap.get(key)!;
    if (loTeam.logoUrl) s.lowerSeedTeam.logoUrl = loTeam.logoUrl;
    if (hiTeam.logoUrl) s.higherSeedTeam.logoUrl = hiTeam.logoUrl;

    if (g.homeWon !== null) {
      const winnerSeed = g.homeWon ? g.homeSeed : g.awaySeed;
      if (winnerSeed === lo) s.lowerWins++;
      else s.higherWins++;
    } else if (g.inProgress) {
      s.hasInProgress = true;
    }
  }

  const winnerMap = new Map<string, Team>();

  // Round 1: assign teams by seed-pair → position mapping
  for (const conf of ["east", "west"] as const) {
    for (const [key, s] of seriesMap.entries()) {
      if (!key.startsWith(`${conf}_r1_`)) continue;
      const seedPart = key.split(`_r1_`)[1];
      const pos = NBA_R1_POSITION[seedPart];
      if (pos === undefined) continue;

      const m = matchups.find((x) => x.round === 1 && x.region === conf && x.position === pos);
      if (!m) continue;

      m.teamA = s.lowerSeedTeam;
      m.teamB = s.higherSeedTeam;
      m.scoreA = s.lowerWins;
      m.scoreB = s.higherWins;

      if (s.lowerWins >= 4) {
        m.winner = s.lowerSeedTeam;
        m.status = "final";
        winnerMap.set(m.id, s.lowerSeedTeam);
      } else if (s.higherWins >= 4) {
        m.winner = s.higherSeedTeam;
        m.status = "final";
        winnerMap.set(m.id, s.higherSeedTeam);
      } else if (s.hasInProgress) {
        m.status = "in_progress";
      }
    }
  }

  // Rounds 2–4: resolve teams from winnerMap then look up series
  for (const round of [2, 3, 4]) {
    for (const m of matchups.filter((x) => x.round === round)) {
      const tA = m.sourceMatchupIds[0] ? (winnerMap.get(m.sourceMatchupIds[0]) ?? null) : null;
      const tB = m.sourceMatchupIds[1] ? (winnerMap.get(m.sourceMatchupIds[1]) ?? null) : null;
      if (!tA || !tB) continue;

      m.teamA = tA;
      m.teamB = tB;

      const conf = m.region ?? "finals";
      const lo = Math.min(tA.seed ?? 0, tB.seed ?? 0);
      const hi = Math.max(tA.seed ?? 0, tB.seed ?? 0);
      const key = `${conf}_r${round}_${lo}v${hi}`;
      const s = seriesMap.get(key);
      if (!s) continue;

      const aIsLo = (tA.seed ?? 0) === s.lowerSeedTeam.seed;
      m.scoreA = aIsLo ? s.lowerWins : s.higherWins;
      m.scoreB = aIsLo ? s.higherWins : s.lowerWins;

      if (s.lowerWins >= 4 || s.higherWins >= 4) {
        const winner = s.lowerWins >= 4 ? s.lowerSeedTeam : s.higherSeedTeam;
        m.winner = winner;
        m.status = "final";
        winnerMap.set(m.id, winner);
      } else if (s.hasInProgress) {
        m.status = "in_progress";
      }
    }
  }

  const finals = matchups.find((m) => m.round === 4);
  if (finals?.winner) (tournament as any).champion = finals.winner;

  (tournament as any).lastUpdated = new Date().toISOString();
  return tournament;
}

export function getLiveNbaBracket(): Promise<Tournament> {
  return buildNbaLiveBracket(nbaStatic);
}
