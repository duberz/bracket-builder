"use client";

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import type { Tournament } from "@/types/bracket";
import { useBracketStore } from "@/lib/store/bracketStore";
import { useThemeStore } from "@/lib/store/themeStore";
import BracketCanvas, { type BracketCanvasHandle } from "@/components/bracket/BracketCanvas";
import Header from "@/components/layout/Header";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EmbedPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tournamentId = params.tournamentId as string;
  const bracketRef = useRef<BracketCanvasHandle>(null);

  const readOnly = searchParams.get("readOnly") === "true";
  const showControls = searchParams.get("controls") !== "false";
  const encodedPicks = searchParams.get("picks");
  const primaryColor = searchParams.get("primaryColor");
  const bgColor = searchParams.get("bgColor");

  const { setTournament, loadPicks } = useBracketStore((s) => ({
    setTournament: s.setTournament,
    loadPicks: s.loadPicks,
  }));
  const { applyToDOM, setBrand } = useThemeStore((s) => ({
    applyToDOM: s.applyToDOM,
    setBrand: s.setBrand,
  }));

  useEffect(() => {
    if (primaryColor) setBrand({ primaryColor });
    if (bgColor) setBrand({ backgroundColor: bgColor });
    applyToDOM();
  }, []);

  const { data, isLoading } = useSWR<Tournament>(
    `/api/bracket/${tournamentId}`,
    fetcher
  );

  useEffect(() => {
    if (data) {
      setTournament(data as Tournament);
      if (encodedPicks) loadPicks(encodedPicks);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="text-[var(--brand-muted)] animate-pulse text-xs">Loading…</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col bg-[var(--brand-bg)]">
      {showControls && (
        <Header bracketRef={bracketRef} showExport={!readOnly} embed />
      )}
      <BracketCanvas ref={bracketRef} tournament={data as Tournament} readOnly={readOnly} />
    </div>
  );
}
