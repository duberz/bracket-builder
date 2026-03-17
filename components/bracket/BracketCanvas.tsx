"use client";

import { useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import type { Tournament, Matchup as MatchupType, Team } from "@/types/bracket";
import { useBracketStore } from "@/lib/store/bracketStore";
import MatchupCard from "./Matchup";
import FanDuelLogo from "@/components/brand/FanDuelLogo";

interface Props {
  tournament: Tournament;
  readOnly?: boolean;
}

export interface BracketCanvasHandle {
  getElement: () => HTMLDivElement | null;
}

const ROUND_WIDTH = 148;
const ROUND_GAP = 20;
const MATCHUP_HEIGHT = 72; // 2 slots + divider
const CONNECTOR_COLOR = "#1066E520";

// Layout for a half-bracket (one side)
function getRoundMatchups(matchups: MatchupType[], side: "left" | "right") {
  const regionIds = side === "left"
    ? ["east", "south"]
    : ["west", "midwest"];

  // Group by round, filter by region
  const byRound: Map<number, MatchupType[]> = new Map();
  for (const m of matchups) {
    if (!regionIds.includes(m.region as string) && m.round < 4) continue;
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round)!.push(m);
  }
  return byRound;
}

// Get all matchups for a given round across all regions
function getRoundAll(matchups: MatchupType[], round: number) {
  return matchups.filter((m) => m.round === round).sort((a, b) => a.position - b.position);
}

export const BracketCanvas = forwardRef<BracketCanvasHandle, Props>(
  ({ tournament, readOnly }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getElement: () => containerRef.current,
    }));

    const picks = useBracketStore((s) => s.picks);
    const getWinner = useBracketStore((s) => s.getWinner);

    const matchups: MatchupType[] = (tournament as any).matchups ?? [];
    const totalRounds = tournament.rounds.length;

    // Resolve projected team for a matchup slot based on picks
    const resolveTeam = (matchupId: string | null): Team | null => {
      if (!matchupId) return null;
      return getWinner(matchupId);
    };

    // Build the bracket layout per round
    const leftRegionIds = ["east", "south"];
    const rightRegionIds = ["west", "midwest"];

    const leftMatchupsByRound = useMemo(() => {
      const map: Map<number, MatchupType[]> = new Map();
      for (const m of matchups) {
        if (m.round < 4 && !leftRegionIds.includes(m.region as string)) continue;
        if (!map.has(m.round)) map.set(m.round, []);
        map.get(m.round)!.push(m);
      }
      return map;
    }, [matchups]);

    const rightMatchupsByRound = useMemo(() => {
      const map: Map<number, MatchupType[]> = new Map();
      for (const m of matchups) {
        if (m.round < 4 && !rightRegionIds.includes(m.region as string)) continue;
        if (!map.has(m.round)) map.set(m.round, []);
        map.get(m.round)!.push(m);
      }
      return map;
    }, [matchups]);

    // Round names
    const roundNames = tournament.rounds.map((r) => r.shortName ?? r.name);
    const roundDates = tournament.rounds.map((r) => r.startDate ?? "");

    const regionalRounds = tournament.rounds.filter((r) => r.roundNumber <= 3);
    const finalRounds = tournament.rounds.filter((r) => r.roundNumber >= 4);

    return (
      <div
        ref={containerRef}
        className="bracket-canvas bg-[var(--brand-bg)] overflow-x-auto overflow-y-hidden"
        style={{ fontFamily: "var(--brand-font, 'Inter', sans-serif)" }}
      >
        {/* Branded header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--brand-secondary)]">
          <FanDuelLogo variant="light" height={28} />
          <div className="text-right">
            <div className="font-bold text-white text-sm leading-tight">{tournament.name}</div>
            <div className="text-white/60 text-xs">{tournament.season}</div>
          </div>
        </div>

        {/* Main bracket grid */}
        <div className="flex items-start gap-0 min-w-max px-2 py-4">
          {/* LEFT SIDE — rounds 0→3 (East + South) */}
          {regionalRounds.map((round) => {
            const rMatchups = (leftMatchupsByRound.get(round.roundNumber) ?? [])
              .sort((a, b) => a.position - b.position);
            const matchupCount = rMatchups.length;
            const totalH = matchupCount > 0
              ? (Math.max(...rMatchups.map(m => m.position)) + 1) * (MATCHUP_HEIGHT + 8) * Math.pow(2, round.roundNumber)
              : 600;

            return (
              <RoundColumn
                key={round.id}
                round={round}
                matchups={rMatchups}
                resolveTeam={resolveTeam}
                readOnly={readOnly}
                side="left"
                totalRounds={totalRounds}
              />
            );
          })}

          {/* CENTER — Final Four + Championship */}
          <div className="flex flex-col items-center justify-center gap-4 px-3 self-center">
            <div className="text-[10px] font-bold text-[var(--brand-muted)] uppercase tracking-widest text-center">
              Final Four
            </div>
            {finalRounds.slice(0, -1).map((round) => {
              const rMatchups = (matchups.filter(m => m.round === round.roundNumber))
                .sort((a, b) => a.position - b.position);
              return (
                <div key={round.id} className="flex flex-col gap-4 items-center">
                  {rMatchups.map((m) => (
                    <MatchupCard
                      key={m.id}
                      matchup={m}
                      resolvedTeamA={resolveTeam(m.sourceMatchupIds[0])}
                      resolvedTeamB={resolveTeam(m.sourceMatchupIds[1])}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              );
            })}

            {/* Championship */}
            {finalRounds.length > 0 && (() => {
              const champRound = finalRounds[finalRounds.length - 1];
              const champMatchups = matchups.filter(m => m.round === champRound.roundNumber);
              return (
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] font-bold text-[var(--brand-muted)] uppercase tracking-widest">Championship</div>
                  {champMatchups.map((m) => (
                    <MatchupCard
                      key={m.id}
                      matchup={m}
                      resolvedTeamA={resolveTeam(m.sourceMatchupIds[0])}
                      resolvedTeamB={resolveTeam(m.sourceMatchupIds[1])}
                      readOnly={readOnly}
                    />
                  ))}
                  <div className="mt-2 border-2 border-[var(--brand-primary)] rounded-lg px-4 py-2 text-center min-w-[120px]">
                    <div className="text-[9px] uppercase tracking-widest text-[var(--brand-muted)]">Champion</div>
                    <div className="font-bold text-[var(--brand-primary)] text-sm">
                      {tournament.champion?.name ??
                        (champMatchups[0] ? resolveTeam(champMatchups[0].id)?.name ?? "?" : "?")}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* RIGHT SIDE — rounds 3→0 (West + Midwest, reversed) */}
          {[...regionalRounds].reverse().map((round) => {
            const rMatchups = (rightMatchupsByRound.get(round.roundNumber) ?? [])
              .sort((a, b) => a.position - b.position);
            return (
              <RoundColumn
                key={`right-${round.id}`}
                round={round}
                matchups={rMatchups}
                resolveTeam={resolveTeam}
                readOnly={readOnly}
                side="right"
                totalRounds={totalRounds}
              />
            );
          })}
        </div>

        {/* Gambling disclaimer footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--brand-secondary)] border-t border-white/10">
          <FanDuelLogo variant="light" height={20} />
          <div className="text-[9px] text-white/70 text-center flex-1 mx-4">
            Gambling Problem? Call 1-800-GAMBLER. Please Gamble Responsibly.
          </div>
          <div className="text-[9px] text-white/50 whitespace-nowrap">
            FanDuel Research · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    );
  }
);

BracketCanvas.displayName = "BracketCanvas";

// ── Round Column ──────────────────────────────────────────────────────────────

interface RoundColumnProps {
  round: { roundNumber: number; name: string; shortName?: string; startDate?: string };
  matchups: MatchupType[];
  resolveTeam: (id: string | null) => Team | null;
  readOnly?: boolean;
  side: "left" | "right";
  totalRounds: number;
}

function RoundColumn({ round, matchups, resolveTeam, readOnly, side, totalRounds }: RoundColumnProps) {
  // Spacing multiplier doubles each round
  const spacingFactor = Math.pow(2, round.roundNumber);
  const slotH = MATCHUP_HEIGHT + 8;
  const spacing = slotH * spacingFactor;
  const firstOffset = spacing / 2 - MATCHUP_HEIGHT / 2;
  const totalH = 16 * slotH; // 16 first-round matchups per side (2 regions × 8), constant for all rounds

  return (
    <div
      className="flex flex-col shrink-0"
      style={{ width: ROUND_WIDTH, marginRight: ROUND_GAP }}
    >
      {/* Round header */}
      <div className="text-center mb-2">
        <div className="text-[11px] font-semibold text-[var(--brand-text)]">
          {round.shortName ?? round.name}
        </div>
        {round.startDate && (
          <div className="text-[9px] text-[var(--brand-muted)]">{round.startDate}</div>
        )}
      </div>

      {/* Matchup slots */}
      <div className="relative" style={{ height: totalH }}>
        {matchups.map((m, idx) => {
          const y = firstOffset + idx * spacing;
          return (
            <div
              key={m.id}
              className="absolute w-full"
              style={{ top: y, height: MATCHUP_HEIGHT }}
            >
              <MatchupCard
                matchup={m}
                resolvedTeamA={resolveTeam(m.sourceMatchupIds[0])}
                resolvedTeamB={resolveTeam(m.sourceMatchupIds[1])}
                readOnly={readOnly}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BracketCanvas;
