import type { BracketLayout, RoundLayout } from "@/types/bracket";

export interface BracketDimensions {
  totalWidth: number;
  totalHeight: number;
  columnWidth: number;
  columnGap: number;
  teamSlotHeight: number;
  connectorPadding: number;
}

const DEFAULTS: BracketDimensions = {
  totalWidth: 1400,
  totalHeight: 800,
  columnWidth: 160,
  columnGap: 24,
  teamSlotHeight: 36,
  connectorPadding: 8,
};

/**
 * Compute full layout for a single-elimination bracket.
 * teamCount must be a power of 2 (or we use the next power of 2).
 */
export function computeLayout(
  teamCount: number,
  dims: Partial<BracketDimensions> = {}
): BracketLayout {
  const d = { ...DEFAULTS, ...dims };
  const roundCount = Math.ceil(Math.log2(teamCount));
  // Two mirror halves: left side + right side
  const halfRounds = roundCount; // rounds per side before championship
  const totalCols = halfRounds * 2 + 1; // +1 for center champ column
  const totalWidth = totalCols * (d.columnWidth + d.columnGap) - d.columnGap;

  // Height: round 0 has teamCount/2 matchups, each needs 2 team slots + padding
  const firstRoundMatchups = teamCount / 2;
  const matchupHeight = d.teamSlotHeight * 2 + d.connectorPadding * 2;
  const totalHeight = Math.max(
    firstRoundMatchups * matchupHeight + 80,
    d.totalHeight
  );

  const rounds: RoundLayout[] = [];

  // Build left-side rounds (round 0 = outermost)
  for (let r = 0; r < roundCount; r++) {
    const matchupCount = Math.pow(2, roundCount - r - 1);
    const spacing = totalHeight / matchupCount;
    const mh = matchupHeight * Math.pow(2, r);
    const x = r * (d.columnWidth + d.columnGap);
    rounds.push({
      roundNumber: r,
      x,
      columnWidth: d.columnWidth,
      matchupHeight: mh,
      matchupCount,
      firstMatchupY: spacing / 2 - mh / 2,
      matchupSpacing: spacing,
    });
  }

  // Championship (center)
  const champX = roundCount * (d.columnWidth + d.columnGap);
  rounds.push({
    roundNumber: roundCount,
    x: champX,
    columnWidth: d.columnWidth,
    matchupHeight: matchupHeight,
    matchupCount: 1,
    firstMatchupY: totalHeight / 2 - matchupHeight / 2,
    matchupSpacing: totalHeight,
  });

  // Build right-side rounds (mirror of left, decreasing round index)
  for (let r = roundCount - 1; r >= 0; r--) {
    const mirrorIdx = 2 * roundCount - r;
    const matchupCount = Math.pow(2, roundCount - r - 1);
    const spacing = totalHeight / matchupCount;
    const mh = matchupHeight * Math.pow(2, r);
    const x = mirrorIdx * (d.columnWidth + d.columnGap);
    rounds.push({
      roundNumber: -(r + 1), // negative = right side
      x,
      columnWidth: d.columnWidth,
      matchupHeight: mh,
      matchupCount,
      firstMatchupY: spacing / 2 - mh / 2,
      matchupSpacing: spacing,
    });
  }

  return {
    totalWidth,
    totalHeight,
    roundCount,
    columnWidth: d.columnWidth,
    columnGap: d.columnGap,
    rowHeight: d.teamSlotHeight,
    teamSlotHeight: d.teamSlotHeight,
    rounds,
  };
}

/**
 * Y position of matchup `index` in a given round layout.
 */
export function matchupY(round: RoundLayout, index: number): number {
  return round.firstMatchupY + index * round.matchupSpacing;
}

/**
 * Y of the top team slot line in a matchup.
 */
export function teamAY(roundLayout: RoundLayout, matchupIndex: number): number {
  return matchupY(roundLayout, matchupIndex) + 8;
}

/**
 * Y of the bottom team slot line in a matchup.
 */
export function teamBY(roundLayout: RoundLayout, matchupIndex: number): number {
  return teamAY(roundLayout, matchupIndex) + roundLayout.matchupHeight / 2;
}

/**
 * SVG connector path from a matchup's right edge to the next round's slot.
 * Used for left-side rounds connecting rightward.
 */
export function connectorPathLeft(
  x1: number,
  yTop: number,
  yBot: number,
  x2: number,
  yMid: number
): string {
  const midX = (x1 + x2) / 2;
  return [
    `M ${x1} ${yTop}`,
    `H ${x1 + (x2 - x1) * 0.5}`,
    `V ${yMid}`,
    `H ${x2}`,
  ].join(" ");
}

/**
 * SVG connector path for right-side rounds connecting leftward.
 */
export function connectorPathRight(
  x1: number,
  yTop: number,
  yBot: number,
  x2: number,
  yMid: number
): string {
  return [
    `M ${x1} ${yTop}`,
    `H ${x1 - (x1 - x2) * 0.5}`,
    `V ${yMid}`,
    `H ${x2}`,
  ].join(" ");
}

/**
 * Generate a unique matchup ID from round + position.
 */
export function matchupId(tournamentId: string, round: number, position: number): string {
  return `${tournamentId}-r${round}-m${position}`;
}

/**
 * Get the round name for common bracket formats.
 */
export function getRoundName(
  roundNumber: number,
  totalRounds: number,
  sport: string
): string {
  const fromEnd = totalRounds - roundNumber;
  if (fromEnd === 0) return "Championship";
  if (fromEnd === 1) return "Final";
  if (fromEnd === 2) return "Semifinals";
  if (fromEnd === 3) {
    if (sport === "ncaa_basketball") return "Elite Eight";
    return "Quarterfinals";
  }
  if (fromEnd === 4 && sport === "ncaa_basketball") return "Sweet 16";
  if (fromEnd === 5 && sport === "ncaa_basketball") return "Round of 32";
  if (fromEnd === 6 && sport === "ncaa_basketball") return "Round of 64";
  return `Round ${roundNumber + 1}`;
}

export function getShortRoundName(
  roundNumber: number,
  totalRounds: number,
  sport: string
): string {
  const fromEnd = totalRounds - roundNumber;
  if (fromEnd === 0) return "Champ";
  if (fromEnd === 1) return "Final";
  if (fromEnd === 2) return "Semis";
  if (fromEnd === 3) return sport === "ncaa_basketball" ? "E8" : "QF";
  if (fromEnd === 4 && sport === "ncaa_basketball") return "S16";
  if (fromEnd === 5 && sport === "ncaa_basketball") return "R32";
  if (fromEnd === 6 && sport === "ncaa_basketball") return "R64";
  return `R${roundNumber + 1}`;
}
