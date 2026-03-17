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
const ROUND_GAP = 24;
const MATCHUP_HEIGHT = 72; // 2 slots + divider
const CONNECTOR_COLOR = "#94a3b8"; // slate-400 — visible but not harsh

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

    const resolveTeam = (matchupId: string | null): Team | null => {
      if (!matchupId) return null;
      return getWinner(matchupId);
    };

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRegionGroups(matchups: MatchupType[]) {
  const seen = new Map<string, number>();
  for (let i = 0; i < matchups.length; i++) {
    const r = matchups[i].region ?? "unknown";
    if (!seen.has(r)) seen.set(r, i);
  }
  return Array.from(seen.entries()).map(([name, startIdx]) => ({ name, startIdx }));
}

// ── Round Column ──────────────────────────────────────────────────────────────

interface RoundColumnProps {
  round: { roundNumber: number; name: string; shortName?: string; startDate?: string };
  matchups: MatchupType[];
  resolveTeam: (id: string | null) => Team | null;
  readOnly?: boolean;
  side: "left" | "right";
  totalRounds: number;
}

function RoundColumn({ round, matchups, resolveTeam, readOnly, side }: RoundColumnProps) {
  const spacingFactor = Math.pow(2, round.roundNumber);
  const slotH = MATCHUP_HEIGHT + 8;
  const spacing = slotH * spacingFactor;
  const firstOffset = spacing / 2 - MATCHUP_HEIGHT / 2;
  const totalH = 16 * slotH; // constant for all rounds (2 regions × 8 matchups each)

  // Region labels only appear on round 0 columns
  const regionGroups = round.roundNumber === 0 ? getRegionGroups(matchups) : [];

  // Connector lines: pair up consecutive matchups (0+1→0, 2+3→1, …)
  // Skip E8 (round 3) — its output connects to the Final Four section
  const showConnectors = round.roundNumber < 3 && matchups.length >= 2;
  const connectorPairs = showConnectors
    ? Array.from({ length: Math.floor(matchups.length / 2) }, (_, k) => {
        const yA = firstOffset + (2 * k) * spacing + MATCHUP_HEIGHT / 2;
        const yB = firstOffset + (2 * k + 1) * spacing + MATCHUP_HEIGHT / 2;
        return { yA, yB, midY: (yA + yB) / 2 };
      })
    : [];

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

        {/* Region labels (round 0 only) */}
        {regionGroups.map(({ name, startIdx }) => {
          const labelY = firstOffset + startIdx * spacing - 14;
          return (
            <div
              key={name}
              className="absolute text-[9px] font-bold uppercase tracking-widest text-center pointer-events-none"
              style={{
                top: Math.max(2, labelY),
                left: 0,
                right: 0,
                color: "var(--brand-primary)",
                opacity: 0.75,
                zIndex: 1,
              }}
            >
              {name}
            </div>
          );
        })}

        {/* Matchup cards */}
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

        {/* Bracket connector SVG — extends into the gap toward the next round */}
        {connectorPairs.length > 0 && (
          <svg
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={
              side === "left"
                ? { top: 0, left: ROUND_WIDTH, width: ROUND_GAP, height: totalH }
                : { top: 0, left: -ROUND_GAP, width: ROUND_GAP, height: totalH }
            }
          >
            {connectorPairs.map(({ yA, yB, midY }, k) =>
              side === "left" ? (
                <g key={k}>
                  {/* From matchup right edge → midpoint */}
                  <line x1={0} y1={yA} x2={ROUND_GAP / 2} y2={yA} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={0} y1={yB} x2={ROUND_GAP / 2} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  {/* Vertical bracket */}
                  <line x1={ROUND_GAP / 2} y1={yA} x2={ROUND_GAP / 2} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  {/* From midpoint → next column left edge */}
                  <line x1={ROUND_GAP / 2} y1={midY} x2={ROUND_GAP} y2={midY} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                </g>
              ) : (
                <g key={k}>
                  {/* From matchup left edge (at x=ROUND_GAP) → midpoint */}
                  <line x1={ROUND_GAP} y1={yA} x2={ROUND_GAP / 2} y2={yA} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={ROUND_GAP} y1={yB} x2={ROUND_GAP / 2} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  {/* Vertical bracket */}
                  <line x1={ROUND_GAP / 2} y1={yA} x2={ROUND_GAP / 2} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  {/* From midpoint → inner column right edge (x=0) */}
                  <line x1={ROUND_GAP / 2} y1={midY} x2={0} y2={midY} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                </g>
              )
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

export default BracketCanvas;
