"use client";

import type { Matchup as MatchupType, Team } from "@/types/bracket";
import { useBracketStore } from "@/lib/store/bracketStore";
import TeamSlot from "./TeamSlot";

interface Props {
  matchup: MatchupType;
  resolvedTeamA?: Team | null; // winner from upstream matchup
  resolvedTeamB?: Team | null;
  readOnly?: boolean;
}

export default function Matchup({
  matchup,
  resolvedTeamA,
  resolvedTeamB,
  readOnly,
}: Props) {
  const pick = useBracketStore((s) => s.pick);
  const picks = useBracketStore((s) => s.picks);
  const getWinner = useBracketStore((s) => s.getWinner);

  const teamA = resolvedTeamA ?? matchup.teamA;
  const teamB = resolvedTeamB ?? matchup.teamB;
  const officialWinner = matchup.winner;
  const userPick = picks[matchup.id];

  const handlePick = (team: Team) => {
    if (readOnly) return;
    if (userPick === team.id) {
      // Toggle off
      useBracketStore.getState().clearPick(matchup.id);
    } else {
      pick(matchup.id, team.id);
    }
  };

  return (
    <div
      className="flex flex-col border border-[var(--brand-primary)]/20 rounded overflow-hidden bg-[var(--brand-surface)] shadow-sm w-full"
      style={{ minWidth: 110 }}
    >
      <TeamSlot
        team={teamA}
        matchupId={matchup.id}
        isWinner={officialWinner?.id === teamA?.id}
        officialWinner={officialWinner}
        onClick={() => teamA && handlePick(teamA)}
        readOnly={readOnly}
      />
      <div className="h-px bg-[var(--brand-primary)]/15" />
      <TeamSlot
        team={teamB}
        matchupId={matchup.id}
        isWinner={officialWinner?.id === teamB?.id}
        officialWinner={officialWinner}
        onClick={() => teamB && handlePick(teamB)}
        readOnly={readOnly}
      />
    </div>
  );
}
