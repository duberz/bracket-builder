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

  return (
    <div
      onClick={() => { if (team && !readOnly) onClick?.(); }}
      className={[
        "flex items-center gap-1 px-1 h-10 text-[14px] leading-none select-none",
        position === "top" ? "border-b border-gray-300" : "",
        team && !readOnly ? "cursor-pointer hover:bg-blue-50 transition-colors" : "cursor-default",
        isPicked ? "font-bold" : "",
        isEliminated ? "opacity-30 line-through" : "",
        !team ? "opacity-20 pointer-events-none" : "",
      ].filter(Boolean).join(" ")}
      title={team ? `${team.name}${team.record ? ` (${team.record})` : ""}` : undefined}
    >
      {/* Seed */}
      {team?.seed && (
        <span className="text-[12px] w-4 text-right shrink-0 text-gray-400 font-normal">
          {team.seed}
        </span>
      )}

      {/* Team logo */}
      {team?.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.logoUrl}
          alt=""
          width={16}
          height={16}
          data-print-hide="true"
          className="shrink-0 object-contain"
          style={{ width: 16, height: 16 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}

      {/* Name */}
      <span className={["truncate min-w-0 flex-1", isPicked ? "text-[#1066E5]" : "text-gray-800"].join(" ")}>
        {team?.shortName ?? team?.name ?? "TBD"}
      </span>

      {/* Record */}
      {team?.record && (
        <span className="text-[11px] shrink-0 text-gray-400 hidden sm:block">
          {team.record}
        </span>
      )}
    </div>
  );
}
