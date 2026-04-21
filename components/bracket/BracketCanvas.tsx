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

const ROUND_WIDTH = 168;
const ROUND_GAP = 24;
const CONNECTOR_OVERHANG = 0;
const BRACKET_TOP_PAD = 10; // extra px above/below first/last card for breathing room
const MATCHUP_HEIGHT = 80; // 2 slots (h-10=40px each) + divider
const SLOT_H = MATCHUP_HEIGHT + 8;
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

    // Derive sides from tournament.regions so this works for any tournament
    const leftRegionIds = useMemo(
      () => tournament.regions.filter((r) => r.side === "left").map((r) => r.id),
      [tournament.regions]
    );
    const rightRegionIds = useMemo(
      () => tournament.regions.filter((r) => r.side === "right").map((r) => r.id),
      [tournament.regions]
    );

    const leftMatchupsByRound = useMemo(() => {
      const map: Map<number, MatchupType[]> = new Map();
      for (const m of matchups) {
        if (m.round < 4 && !leftRegionIds.includes(m.region as string)) continue;
        if (!map.has(m.round)) map.set(m.round, []);
        map.get(m.round)!.push(m);
      }
      return map;
    }, [matchups, leftRegionIds]);

    const rightMatchupsByRound = useMemo(() => {
      const map: Map<number, MatchupType[]> = new Map();
      for (const m of matchups) {
        if (m.round < 4 && !rightRegionIds.includes(m.region as string)) continue;
        if (!map.has(m.round)) map.set(m.round, []);
        map.get(m.round)!.push(m);
      }
      return map;
    }, [matchups, rightRegionIds]);

    const regionalRounds = tournament.rounds.filter((r) => r.roundNumber <= 3);
    const finalRounds = tournament.rounds.filter((r) => r.roundNumber >= 4);

    // Always render with 8-slot total height (704px) so NBA/NHL (4 R1 matchups) get the
    // same canvas as NCAA (8 R0 matchups). Spacing scales proportionally: fewer matchups
    // → larger per-matchup spacing → proper visual pair separation.
    const { totalH, firstRound, lastRegionalRound, maxFirstRoundMatchups } = useMemo(() => {
      const regionalKeys = [
        ...leftMatchupsByRound.keys(),
        ...rightMatchupsByRound.keys(),
      ].filter((k) => k <= 3);
      if (regionalKeys.length === 0) return { totalH: 8 * SLOT_H, firstRound: 0, lastRegionalRound: 3, maxFirstRoundMatchups: 8 };
      const fr = Math.min(...regionalKeys);
      const lr = Math.max(...regionalKeys);
      const maxMatchups = Math.max(
        leftMatchupsByRound.get(fr)?.length ?? 0,
        rightMatchupsByRound.get(fr)?.length ?? 0
      );
      return {
        totalH: 8 * SLOT_H + 2 * BRACKET_TOP_PAD, // fixed canvas + breathing room
        firstRound: fr,
        lastRegionalRound: lr,
        maxFirstRoundMatchups: maxMatchups > 0 ? maxMatchups : 8,
      };
    }, [leftMatchupsByRound, rightMatchupsByRound]);


    return (
      <div className="bracket-scroll-container">
      <div
        ref={containerRef}
        className="bracket-canvas bg-[var(--brand-bg)] flex flex-col"
        style={{ fontFamily: "var(--brand-font, 'Inter', sans-serif)", width: "fit-content" }}
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
          {/* LEFT REGION LABELS */}
          <div className="flex flex-col shrink-0 mr-2" style={{ width: 48, height: totalH }}>
            {tournament.regions.filter(r => r.side === "left").map(region => (
              <div key={region.id} className="flex-1 flex items-center justify-center">
                <span
                  className="font-black uppercase"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    color: "var(--brand-primary)",
                    fontSize: 22,
                    letterSpacing: "0.15em",
                  }}
                >
                  {region.name}
                </span>
              </div>
            ))}
          </div>

          {/* LEFT SIDE — rounds inward */}
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
                totalH={totalH}
                firstRound={firstRound}
                lastRegionalRound={lastRegionalRound}
                maxFirstRoundMatchups={maxFirstRoundMatchups}
              />
            );
          })}

          {/* CENTER — semi-finals (if any) + championship/finals */}
          <div className="flex flex-col items-center justify-center gap-4 px-4 self-center rounded-xl bg-white/60 border border-[var(--brand-primary)]/20 py-6 mx-2">
            {/* FanDuel branding */}
            <div className="flex flex-col items-center mb-2">
              <FanDuelLogo variant="vertical-blue" height={72} />
            </div>

            {/* Semi-final games shown only when they exist (NCAA Final Four) */}
            {finalRounds.length > 1 && (
              <>
                <div className="text-[13px] font-bold text-[var(--brand-muted)] uppercase tracking-widest text-center">
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
              </>
            )}

            {/* Championship / NBA Finals */}
            {finalRounds.length > 0 && (() => {
              const champRound = finalRounds[finalRounds.length - 1];
              const champMatchups = matchups.filter(m => m.round === champRound.roundNumber);
              const champLabel = champRound.name ?? "Championship";
              return (
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[12px] font-bold text-[var(--brand-muted)] uppercase tracking-widest">{champLabel}</div>
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
                    <div className="text-[11px] uppercase tracking-widest text-[var(--brand-muted)]">Champion</div>
                    <div className="font-bold text-[var(--brand-primary)] text-sm">
                      {tournament.champion?.name ??
                        (champMatchups[0] ? resolveTeam(champMatchups[0].id)?.name ?? "?" : "?")}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* RIGHT SIDE — rounds inward (reversed) */}
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
                totalH={totalH}
                firstRound={firstRound}
                lastRegionalRound={lastRegionalRound}
                maxFirstRoundMatchups={maxFirstRoundMatchups}
              />
            );
          })}

          {/* RIGHT REGION LABELS */}
          <div className="flex flex-col shrink-0 ml-2" style={{ width: 48, height: totalH }}>
            {tournament.regions.filter(r => r.side === "right").map(region => (
              <div key={region.id} className="flex-1 flex items-center justify-center">
                <span
                  className="font-black uppercase"
                  style={{
                    writingMode: "vertical-rl",
                    color: "var(--brand-primary)",
                    fontSize: 22,
                    letterSpacing: "0.15em",
                  }}
                >
                  {region.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gambling disclaimer footer */}
        <div className="px-4 py-2 bg-[var(--brand-secondary)] border-t border-white/10">
          <div className="flex items-center justify-between mb-1">
            <FanDuelLogo variant="light" height={20} />
            <div className="text-[9px] text-white/50 whitespace-nowrap">
              FanDuel Research · {new Date().getFullYear()}
            </div>
          </div>
          <div className="text-[8px] text-white/60 text-center leading-relaxed">
            If you or someone you know has a gambling problem, help is available. Call (877-8-HOPENY) or text HOPENY (467369)
          </div>
          <div className="text-[8px] text-white/50 text-center leading-relaxed">
            This site has been authorized by the New York State Gaming Commission for use by registered users physically present in New York.
          </div>
          <div className="text-[8px] text-white/50 text-center leading-relaxed">
            Persons under 21 are not permitted to engage in sports wagering.
          </div>
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
  totalH: number;
  firstRound: number;
  lastRegionalRound: number;
  maxFirstRoundMatchups: number;
}

function RoundColumn({ round, matchups, resolveTeam, readOnly, side, totalH, firstRound, lastRegionalRound, maxFirstRoundMatchups }: RoundColumnProps) {
  // Scale spacing so brackets with fewer first-round matchups use proportionally larger spacing,
  // keeping the same 704px canvas height as an 8-matchup bracket (NCAA baseline).
  // NBA/NHL have 4 R1 matchups → slotMultiplier=2 → spacing=176px (vs NCAA's 88px).
  const spacingFactor = Math.pow(2, round.roundNumber - firstRound);
  const slotMultiplier = 8 / maxFirstRoundMatchups;
  const spacing = SLOT_H * spacingFactor * slotMultiplier;
  const firstOffset = spacing / 2 - MATCHUP_HEIGHT / 2 + BRACKET_TOP_PAD;

  const regionGroups: { name: string; startIdx: number }[] = [];

  const showConnectors = round.roundNumber < lastRegionalRound && matchups.length >= 2;
  const gap = spacing - MATCHUP_HEIGHT;
  const connectorPairs = showConnectors
    ? Array.from({ length: Math.floor(matchups.length / 2) }, (_, k) => {
        let yA: number, yB: number;
        if (gap >= MATCHUP_HEIGHT) {
          // Spacious: arm exits at card bottom border, enters at card top — shape lives in gap
          yA = firstOffset + (2 * k) * spacing + MATCHUP_HEIGHT;
          yB = firstOffset + (2 * k + 1) * spacing;
        } else {
          // Dense (NCAA R0): card-center style
          yA = firstOffset + (2 * k) * spacing + MATCHUP_HEIGHT / 2;
          yB = firstOffset + (2 * k + 1) * spacing + MATCHUP_HEIGHT / 2;
        }
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
        <div className="text-[14px] font-semibold text-[var(--brand-text)]">
          {round.shortName ?? round.name}
        </div>
        {round.startDate && (
          <div className="text-[11px] text-[var(--brand-muted)]">{round.startDate}</div>
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

        {/* Bracket connector SVG — overlaps card edges by CONNECTOR_OVERHANG px so lines visually dock onto the slot divider */}
        {connectorPairs.length > 0 && (
          <svg
            aria-hidden="true"
            overflow="visible"
            className="absolute pointer-events-none"
            style={
              side === "left"
                ? { top: 0, left: ROUND_WIDTH, width: ROUND_GAP, height: totalH }
                : { top: 0, left: -ROUND_GAP, width: ROUND_GAP, height: totalH }
            }
          >
            {connectorPairs.map(({ yA, yB }, k) =>
              side === "left" ? (
                <g key={k}>
                  <line x1={0} y1={yA} x2={ROUND_GAP} y2={yA} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={0} y1={yB} x2={ROUND_GAP} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={ROUND_GAP} y1={yA} x2={ROUND_GAP} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                </g>
              ) : (
                <g key={k}>
                  <line x1={ROUND_GAP} y1={yA} x2={0} y2={yA} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={ROUND_GAP} y1={yB} x2={0} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={0} y1={yA} x2={0} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
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
