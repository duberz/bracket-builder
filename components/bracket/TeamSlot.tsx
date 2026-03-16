"use client";

import type { Team } from "@/types/bracket";
import { useBracketStore } from "@/lib/store/bracketStore";

interface Props {
  team: Team | null;
  matchupId: string;
  isWinner?: boolean;
  officialWinner?: Team | null;
  onClick?: () => void;
  readOnly?: boolean;
}

export default function TeamSlot({
  team,
  matchupId,
  isWinner,
  officialWinner,
  onClick,
  readOnly,
}: Props) {
  const picks = useBracketStore((s) => s.picks);
  const isPicked = team && picks[matchupId] === team.id;
  const isEliminated =
    officialWinner && team && officialWinner.id !== team.id;

  const handleClick = () => {
    if (!team || readOnly) return;
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      className={[
        "flex items-center gap-1.5 px-2 h-8 text-xs leading-none rounded",
        "transition-all duration-150 select-none",
        team && !readOnly ? "cursor-pointer hover:bg-[var(--brand-primary)] hover:text-white group" : "cursor-default",
        isPicked ? "bg-[var(--brand-primary)] text-white font-semibold" : "bg-transparent text-[var(--brand-text)]",
        isWinner && !isPicked ? "font-semibold" : "",
        isEliminated ? "opacity-30 line-through" : "",
        !team ? "opacity-0 pointer-events-none" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={team ? `${team.name}${team.record ? ` (${team.record})` : ""}` : undefined}
    >
      {team?.seed && (
        <span
          className={[
            "text-[10px] font-bold w-4 text-right shrink-0",
            isPicked ? "text-white/70" : "text-[var(--brand-muted)]",
          ].join(" ")}
        >
          {team.seed}
        </span>
      )}
      <span className="truncate min-w-0 flex-1">{team?.shortName ?? team?.name ?? "TBD"}</span>
      {team?.record && (
        <span
          className={[
            "text-[9px] shrink-0 hidden sm:block",
            isPicked ? "text-white/60" : "text-[var(--brand-muted)]",
          ].join(" ")}
        >
          {team.record}
        </span>
      )}
    </div>
  );
}
