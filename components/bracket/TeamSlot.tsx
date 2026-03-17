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
  position: "top" | "bottom";
}

export default function TeamSlot({
  team,
  matchupId,
  isWinner,
  officialWinner,
  onClick,
  readOnly,
  position,
}: Props) {
  const picks = useBracketStore((s) => s.picks);
  const isPicked = team && picks[matchupId] === team.id;
  const isEliminated = officialWinner && team && officialWinner.id !== team.id;

  const handleClick = () => {
    if (!team || readOnly) return;
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      className={[
        "flex items-center gap-1 px-1 h-8 text-[11px] leading-none select-none",
        // Bottom line on top slot only — bottom slot has no line (outer container provides bottom)
        position === "top" ? "border-b border-gray-300" : "",
        team && !readOnly ? "cursor-pointer hover:bg-blue-50 transition-colors" : "cursor-default",
        isPicked ? "font-bold" : "",
        isEliminated ? "opacity-30 line-through" : "",
        !team ? "opacity-0 pointer-events-none" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={team ? `${team.name}${team.record ? ` (${team.record})` : ""}` : undefined}
    >
      {team?.seed && (
        <span className="text-[10px] w-4 text-right shrink-0 text-gray-400 font-normal">
          {team.seed}
        </span>
      )}
      <span
        className={["truncate min-w-0 flex-1", isPicked ? "text-[#1066E5]" : "text-gray-800"].join(" ")}
      >
        {team?.shortName ?? team?.name ?? "TBD"}
      </span>
      {team?.record && (
        <span className="text-[9px] shrink-0 text-gray-400 hidden sm:block">
          {team.record}
        </span>
      )}
    </div>
  );
}
