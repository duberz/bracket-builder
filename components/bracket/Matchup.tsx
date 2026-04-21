"use client";

import type { Matchup as MatchupType, Team } from "@/types/bracket";
import { useBracketStore } from "@/lib/store/bracketStore";
import TeamSlot from "./TeamSlot";

interface Props {
  matchup: MatchupType;
  resolvedTeamA?: Team | null;
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

  const teamA = resolvedTeamA ?? matchup.teamA;
  const teamB = resolvedTeamB ?? matchup.teamB;
  const officialWinner = matchup.winner;

  const handlePick = (team: Team) => {
    if (readOnly) return;
    if (picks[matchup.id] === team.id) {
      useBracketStore.getState().clearPick(matchup.id);
    } else {
      pick(matchup.id, team.id);
    }
  };

  const isEmpty = !teamA && !teamB;

  return (
    <div
      className={["flex flex-col w-full border border-gray-300", isEmpty ? "opacity-20 pointer-events-none" : ""].filter(Boolean).join(" ")}
      style={{ minWidth: 110 }}
    >
      <TeamSlot
        team={teamA}
        matchupId={matchup.id}
        isWinner={officialWinner?.id === teamA?.id}
        officialWinner={officialWinner}
        onClick={() => teamA && handlePick(teamA)}
        readOnly={readOnly}
        position="top"
      />
      <TeamSlot
        team={teamB}
        matchupId={matchup.id}
        isWinner={officialWinner?.id === teamB?.id}
        officialWinner={officialWinner}
        onClick={() => teamB && handlePick(teamB)}
        readOnly={readOnly}
        position="bottom"
      />
    </div>
  );
}
