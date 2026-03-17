"use client";

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import type { Tournament } from "@/types/bracket";
import { useBracketStore } from "@/lib/store/bracketStore";
import { useThemeStore } from "@/lib/store/themeStore";
import BracketCanvas, { type BracketCanvasHandle } from "@/components/bracket/BracketCanvas";
import Header from "@/components/layout/Header";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function BracketPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tournamentId = params.tournamentId as string;
  const bracketRef = useRef<BracketCanvasHandle>(null);

  const { setTournament, loadPicks } = useBracketStore((s) => ({
    setTournament: s.setTournament,
    loadPicks: s.loadPicks,
  }));
  const applyToDOM = useThemeStore((s) => s.applyToDOM);

  const { data, error, isLoading } = useSWR<Tournament>(
    `/api/bracket/${tournamentId}`,
    fetcher,
    { refreshInterval: 0 }
  );

  useEffect(() => {
    applyToDOM();
  }, []);

  useEffect(() => {
    if (data) {
      setTournament(data as Tournament);
      const encodedPicks = searchParams.get("picks");
      if (encodedPicks) loadPicks(encodedPicks);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--brand-bg)]">
        <div className="text-[var(--brand-muted)] animate-pulse text-sm">Loading bracket…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--brand-bg)]">
        <div className="text-red-500 text-sm">Failed to load tournament data.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--brand-bg)]">
      <Header bracketRef={bracketRef} showExport />
      <main className="flex-1 overflow-auto">
        <BracketCanvas ref={bracketRef} tournament={data as Tournament} />
      </main>
      <footer className="text-center py-2 text-[10px] text-[var(--brand-muted)] border-t border-[var(--brand-primary)]/10">
        Gambling Problem? Call 1-800-GAMBLER · FanDuel Research · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
