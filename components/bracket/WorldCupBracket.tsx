"use client";

import { useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import type { Tournament, Matchup as MatchupType, Team, WorldCupGroup } from "@/types/bracket";
import { useBracketStore } from "@/lib/store/bracketStore";
import MatchupCard from "./Matchup";
import FanDuelLogo from "@/components/brand/FanDuelLogo";

interface Props {
  tournament: Tournament;
  readOnly?: boolean;
}

export interface WorldCupBracketHandle {
  getElement: () => HTMLDivElement | null;
}

// ── Layout constants (32-team bracket — 8 matchups per side) ─────────────────
const ROUND_WIDTH = 140;
const ROUND_GAP = 20;
const CONNECTOR_OVERHANG = 0;
const MATCHUP_HEIGHT = 60;
const SLOT_H = MATCHUP_HEIGHT + 8;
const TOTAL_H = 8 * SLOT_H; // 8 R32 matchups per side
const CONNECTOR_COLOR = "#94a3b8";

export const WorldCupBracket = forwardRef<WorldCupBracketHandle, Props>(
  ({ tournament, readOnly }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getElement: () => containerRef.current,
    }));

    const picks = useBracketStore((s) => s.picks);
    const getWinner = useBracketStore((s) => s.getWinner);
    const pickFn = useBracketStore((s) => s.pick);
    const clearPick = useBracketStore((s) => s.clearPick);

    const matchups: MatchupType[] = (tournament as any).matchups ?? [];
    const groups: WorldCupGroup[] = tournament.groups ?? [];

    const resolveTeam = (matchupId: string | null): Team | null => {
      if (!matchupId) return null;
      return getWinner(matchupId);
    };

    // ── Group stage picks ───────────────────────────────────────────────────

    const handleGroupPick = (groupId: string, rank: 1 | 2, teamId: string) => {
      if (readOnly) return;
      const slotKey = `${groupId}-${rank === 1 ? "1st" : "2nd"}`;
      const otherSlotKey = `${groupId}-${rank === 1 ? "2nd" : "1st"}`;
      const currentPick = picks[slotKey];
      const otherPick = picks[otherSlotKey];

      if (currentPick === teamId) {
        // Clicking same team again — unrank
        clearPick(slotKey);
      } else if (otherPick === teamId) {
        // Picking a team already in the other slot — swap
        pickFn(slotKey, teamId);
        clearPick(otherSlotKey);
      } else {
        pickFn(slotKey, teamId);
      }
    };

    // ── Knockout bracket logic ──────────────────────────────────────────────

    const leftRegionIds = useMemo(
      () => tournament.regions.filter((r) => r.side === "left").map((r) => r.id),
      [tournament.regions]
    );
    const rightRegionIds = useMemo(
      () => tournament.regions.filter((r) => r.side === "right").map((r) => r.id),
      [tournament.regions]
    );

    const leftMatchupsByRound = useMemo(() => {
      const map = new Map<number, MatchupType[]>();
      for (const m of matchups) {
        if (m.round < 3 && !leftRegionIds.includes(m.region as string)) continue;
        if (!map.has(m.round)) map.set(m.round, []);
        map.get(m.round)!.push(m);
      }
      return map;
    }, [matchups, leftRegionIds]);

    const rightMatchupsByRound = useMemo(() => {
      const map = new Map<number, MatchupType[]>();
      for (const m of matchups) {
        if (m.round < 3 && !rightRegionIds.includes(m.region as string)) continue;
        if (!map.has(m.round)) map.set(m.round, []);
        map.get(m.round)!.push(m);
      }
      return map;
    }, [matchups, rightRegionIds]);

    const regionalRounds = tournament.rounds.filter((r) => r.roundNumber <= 2);
    const finalRounds = tournament.rounds.filter((r) => r.roundNumber >= 3);

    // ── Helpers ─────────────────────────────────────────────────────────────

    const getGroupRank = (groupId: string, rank: 1 | 2): string | undefined => {
      return picks[`${groupId}-${rank === 1 ? "1st" : "2nd"}`];
    };

    return (
      <div className="bracket-scroll-container">
      <div
        ref={containerRef}
        className="wc-bracket bg-[var(--brand-bg)] flex flex-col"
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

        {/* ── GROUP STAGE ──────────────────────────────────────────────── */}
        <div className="px-4 py-5 border-b border-[var(--brand-primary)]/20">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--brand-primary)] mb-4">
            Group Stage — Pick 1st &amp; 2nd from each group
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                firstId={getGroupRank(group.id, 1)}
                secondId={getGroupRank(group.id, 2)}
                onPick={(rank, teamId) => handleGroupPick(group.id, rank, teamId)}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>

        {/* ── KNOCKOUT BRACKET ─────────────────────────────────────────── */}
        <div className="px-4 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--brand-primary)] mb-4">
            Knockout Stage — Pick match winners
          </h2>

          <div className="flex items-start gap-0 min-w-max overflow-x-auto pb-2">
            {/* Left side — R32 → R16 → QF */}
            {regionalRounds.map((round) => {
              const rMatchups = (leftMatchupsByRound.get(round.roundNumber) ?? [])
                .sort((a, b) => a.position - b.position);
              return (
                <KnockoutRoundColumn
                  key={round.id}
                  round={round}
                  matchups={rMatchups}
                  resolveTeam={resolveTeam}
                  readOnly={readOnly}
                  side="left"
                />
              );
            })}

            {/* CENTER — SF + Final */}
            <div className="flex flex-col items-center justify-center gap-4 px-4 self-center rounded-xl bg-white/60 border border-[var(--brand-primary)]/20 py-6 mx-2 min-w-[160px]">
              <div className="flex flex-col items-center mb-1">
                <FanDuelLogo variant="vertical-blue" height={56} />
              </div>
              <div className="text-[11px] font-bold text-[var(--brand-muted)] uppercase tracking-widest text-center">
                Semifinals
              </div>
              {finalRounds.slice(0, -1).map((round) => {
                const rMatchups = matchups
                  .filter((m) => m.round === round.roundNumber)
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

              {/* Final */}
              {finalRounds.length > 0 && (() => {
                const champRound = finalRounds[finalRounds.length - 1];
                const champMatchups = matchups.filter((m) => m.round === champRound.roundNumber);
                return (
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[10px] font-bold text-[var(--brand-muted)] uppercase tracking-widest">
                      Final
                    </div>
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
                          (champMatchups[0]
                            ? resolveTeam(champMatchups[0].id)?.name ?? "?"
                            : "?")}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right side — QF → R16 → R32 (reversed) */}
            {[...regionalRounds].reverse().map((round) => {
              const rMatchups = (rightMatchupsByRound.get(round.roundNumber) ?? [])
                .sort((a, b) => a.position - b.position);
              return (
                <KnockoutRoundColumn
                  key={`right-${round.id}`}
                  round={round}
                  matchups={rMatchups}
                  resolveTeam={resolveTeam}
                  readOnly={readOnly}
                  side="right"
                />
              );
            })}
          </div>
        </div>

        {/* Footer */}
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

WorldCupBracket.displayName = "WorldCupBracket";

// ── Group Card ────────────────────────────────────────────────────────────────

interface GroupCardProps {
  group: WorldCupGroup;
  firstId?: string;
  secondId?: string;
  onPick: (rank: 1 | 2, teamId: string) => void;
  readOnly?: boolean;
}

function GroupCard({ group, firstId, secondId, onPick, readOnly }: GroupCardProps) {
  return (
    <div className="rounded-lg border border-[var(--brand-primary)]/20 bg-[var(--brand-surface)] overflow-hidden">
      <div className="px-2 py-1 bg-[var(--brand-primary)] text-white text-[10px] font-bold uppercase tracking-wider">
        {group.name}
      </div>
      <div className="flex flex-col">
        {group.teams.map((team) => {
          const isFirst = firstId === team.id;
          const isSecond = secondId === team.id;
          const rank = isFirst ? 1 : isSecond ? 2 : null;

          return (
            <div
              key={team.id}
              onClick={() => {
                if (readOnly) return;
                if (rank === 1) {
                  onPick(1, team.id); // will unrank
                } else if (rank === 2) {
                  onPick(2, team.id); // will unrank
                } else if (!firstId) {
                  onPick(1, team.id);
                } else if (!secondId) {
                  onPick(2, team.id);
                } else {
                  // Both slots full — replace slot 2 with this team
                  onPick(2, team.id);
                }
              }}
              className={[
                "flex items-center gap-1.5 px-2 py-1 text-[11px] select-none border-b border-gray-100 last:border-0",
                !readOnly ? "cursor-pointer hover:bg-blue-50 transition-colors" : "cursor-default",
                isFirst ? "bg-amber-50" : isSecond ? "bg-slate-50" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* Rank badge */}
              <span
                className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold"
                style={{
                  background: isFirst ? "#f59e0b" : isSecond ? "#94a3b8" : "#e5e7eb",
                  color: isFirst || isSecond ? "white" : "#9ca3af",
                }}
              >
                {isFirst ? "1" : isSecond ? "2" : "·"}
              </span>

              {/* Flag */}
              {team.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={team.logoUrl}
                  alt=""
                  width={16}
                  height={12}
                  data-print-hide="true"
                  className="shrink-0 object-cover rounded-[2px]"
                  style={{ width: 18, height: 13 }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}

              {/* Name */}
              <span
                className={[
                  "truncate min-w-0 flex-1",
                  isFirst
                    ? "text-amber-700 font-bold"
                    : isSecond
                    ? "text-slate-600 font-semibold"
                    : "text-gray-700",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {team.abbreviation}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Knockout Round Column ─────────────────────────────────────────────────────

interface KnockoutRoundColumnProps {
  round: { roundNumber: number; name: string; shortName?: string };
  matchups: MatchupType[];
  resolveTeam: (id: string | null) => Team | null;
  readOnly?: boolean;
  side: "left" | "right";
}

function KnockoutRoundColumn({
  round,
  matchups,
  resolveTeam,
  readOnly,
  side,
}: KnockoutRoundColumnProps) {
  const spacingFactor = Math.pow(2, round.roundNumber);
  const spacing = SLOT_H * spacingFactor;
  const firstOffset = spacing / 2 - MATCHUP_HEIGHT / 2;

  const showConnectors = round.roundNumber < 2 && matchups.length >= 2;
  const connectorPairs = showConnectors
    ? Array.from({ length: Math.floor(matchups.length / 2) }, (_, k) => {
        const yA = firstOffset + 2 * k * spacing + MATCHUP_HEIGHT / 2;
        const yB = firstOffset + (2 * k + 1) * spacing + MATCHUP_HEIGHT / 2;
        return { yA, yB, midY: (yA + yB) / 2 };
      })
    : [];

  return (
    <div
      className="flex flex-col shrink-0"
      style={{ width: ROUND_WIDTH, marginRight: ROUND_GAP }}
    >
      <div className="text-center mb-2">
        <div className="text-[11px] font-semibold text-[var(--brand-text)]">
          {round.shortName ?? round.name}
        </div>
      </div>

      <div className="relative" style={{ height: TOTAL_H }}>
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

        {connectorPairs.length > 0 && (
          <svg
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={
              side === "left"
                ? { top: 0, left: ROUND_WIDTH - CONNECTOR_OVERHANG, width: ROUND_GAP + 2 * CONNECTOR_OVERHANG, height: TOTAL_H }
                : { top: 0, left: -(ROUND_GAP + CONNECTOR_OVERHANG), width: ROUND_GAP + 2 * CONNECTOR_OVERHANG, height: TOTAL_H }
            }
          >
            {connectorPairs.map(({ yA, yB, midY }, k) => {
              const midX = ROUND_GAP / 2 + CONNECTOR_OVERHANG;
              const farX = ROUND_GAP + 2 * CONNECTOR_OVERHANG;
              return side === "left" ? (
                <g key={k}>
                  <line x1={0} y1={yA} x2={midX} y2={yA} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={0} y1={yB} x2={midX} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={midX} y1={yA} x2={midX} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={midX} y1={midY} x2={farX} y2={midY} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                </g>
              ) : (
                <g key={k}>
                  <line x1={farX} y1={yA} x2={midX} y2={yA} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={farX} y1={yB} x2={midX} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={midX} y1={yA} x2={midX} y2={yB} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                  <line x1={midX} y1={midY} x2={0} y2={midY} stroke={CONNECTOR_COLOR} strokeWidth={1} />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

export default WorldCupBracket;
