"use client";

import Link from "next/link";
import { useRef } from "react";
import { useBracketStore } from "@/lib/store/bracketStore";
import ExportMenu from "@/components/controls/ExportMenu";
import type { BracketCanvasHandle } from "@/components/bracket/BracketCanvas";

interface Props {
  bracketRef?: React.RefObject<BracketCanvasHandle | null>;
  showExport?: boolean;
  embed?: boolean;
}

export default function Header({ bracketRef, showExport, embed }: Props) {
  const { tournament, reset } = useBracketStore((s) => ({
    tournament: s.tournament,
    reset: s.reset,
  }));

  const handleShare = () => {
    const encoded = useBracketStore.getState().encodePicks();
    const url = new URL(window.location.href);
    url.searchParams.set("picks", encoded);
    navigator.clipboard.writeText(url.toString());
    alert("Bracket link copied to clipboard!");
  };

  if (embed) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--brand-secondary)] text-white text-xs">
        <span className="font-bold tracking-wide">
          {tournament?.shortName ?? "Bracket Builder"}
        </span>
        {showExport && bracketRef && (
          <ExportMenu bracketRef={bracketRef} tournamentName={tournament?.shortName} />
        )}
      </div>
    );
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-[var(--brand-secondary)] text-white shadow-md">
      <Link href="/" className="flex items-center gap-3 no-underline">
        {/* FanDuel Research shield */}
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-10 flex items-center justify-center rounded font-black text-lg"
            style={{ background: "var(--brand-primary)" }}
          >
            F
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm tracking-wide">FANDUEL</div>
            <div className="text-[10px] text-white/60 tracking-widest">RESEARCH</div>
          </div>
        </div>
        <div className="w-px h-8 bg-white/20" />
        <div className="text-sm font-semibold text-white/90">Bracket Builder</div>
      </Link>

      <div className="flex items-center gap-2">
        {tournament && (
          <>
            <button
              onClick={handleShare}
              className="px-3 py-1.5 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              Share 🔗
            </button>
            <button
              onClick={reset}
              className="px-3 py-1.5 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              Reset
            </button>
          </>
        )}
        {showExport && bracketRef && (
          <ExportMenu bracketRef={bracketRef} tournamentName={tournament?.shortName} />
        )}
      </div>
    </header>
  );
}
