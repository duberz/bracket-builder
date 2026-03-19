// ─── Brand / Theme ────────────────────────────────────────────────────────────

export interface BrandConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  logoUrl?: string;
  fontFamily?: string;
  name?: string;
}

export const FANDUEL_BRAND: BrandConfig = {
  name: "FanDuel Research",
  primaryColor: "#1066E5",
  secondaryColor: "#0a1929",
  backgroundColor: "#f5f7fa",
  surfaceColor: "#ffffff",
  textColor: "#0a1929",
  mutedTextColor: "#6b7280",
  accentColor: "#00d4aa",
  fontFamily: "'Inter', sans-serif",
};

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  seed?: number;
  logoUrl?: string;
  conference?: string;
  region?: string;
  record?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

// ─── Matchup ──────────────────────────────────────────────────────────────────

export type MatchupStatus = "scheduled" | "in_progress" | "final" | "bye";

export interface Matchup {
  id: string;
  round: number;
  position: number;
  region?: string;
  teamA: Team | null;
  teamB: Team | null;
  winner: Team | null;
  scoreA?: number;
  scoreB?: number;
  status: MatchupStatus;
  startTime?: string;
  sourceMatchupIds: [string | null, string | null];
}

// ─── Round ────────────────────────────────────────────────────────────────────

export interface Round {
  id: string;
  roundNumber: number;
  name: string;
  shortName?: string;
  matchups: Matchup[];
  startDate?: string;
  endDate?: string;
}

// ─── Region ───────────────────────────────────────────────────────────────────

export interface Region {
  id: string;
  name: string;
  side: "left" | "right";
  position: number;
  teams: Team[];
}

// ─── World Cup Group ──────────────────────────────────────────────────────────

export interface WorldCupGroup {
  id: string;   // "group-a"
  name: string; // "Group A"
  teams: Team[];
}

// ─── Tournament ───────────────────────────────────────────────────────────────

export type SportType =
  | "ncaa_basketball"
  | "nfl_playoffs"
  | "nba_playoffs"
  | "nhl_playoffs"
  | "soccer"
  | "custom";

export type BracketFormat =
  | "single_elimination"
  | "double_elimination"
  | "group_then_knockout";

export interface TournamentMeta {
  id: string;
  name: string;
  shortName: string;
  sport: SportType;
  season: string;
  format: BracketFormat;
  teamCount: number;
  hasRegions: boolean;
  hasFirstFour?: boolean;
  logoUrl?: string;
  dataSource?: string;
  lastUpdated?: string;
}

export interface Tournament extends TournamentMeta {
  regions: Region[];
  rounds: Round[];
  matchups?: Matchup[];   // flat matchup list (populated from static JSON / API)
  groups?: WorldCupGroup[]; // group stage (group_then_knockout format only)
  champion: Team | null;
  brand?: Partial<BrandConfig>;
}

// ─── User Picks ───────────────────────────────────────────────────────────────

export type PickMap = Record<string, string>;

export interface BracketState {
  tournamentId: string;
  picks: PickMap;
}

// ─── Embed Config ─────────────────────────────────────────────────────────────

export interface EmbedConfig {
  tournamentId: string;
  readOnly?: boolean;
  showControls?: boolean;
  brand?: Partial<BrandConfig>;
  initialPicksEncoded?: string;
}

// ─── Data Feed ────────────────────────────────────────────────────────────────

export type DataProvider = "espn" | "sportsdata_io" | "static" | "custom";

export interface DataFeedConfig {
  sport: SportType;
  provider: DataProvider;
  apiKey?: string;
  baseUrl?: string;
  pollIntervalMs?: number;
  tournamentId: string;
}

// ─── Layout Math ──────────────────────────────────────────────────────────────

export interface BracketLayout {
  totalWidth: number;
  totalHeight: number;
  roundCount: number;
  columnWidth: number;
  columnGap: number;
  rowHeight: number;
  teamSlotHeight: number;
  rounds: RoundLayout[];
}

export interface RoundLayout {
  roundNumber: number;
  x: number;
  columnWidth: number;
  matchupHeight: number;
  matchupCount: number;
  firstMatchupY: number;
  matchupSpacing: number;
}
