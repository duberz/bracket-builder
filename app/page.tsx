"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useThemeStore } from "@/lib/store/themeStore";

const SPORT_ICONS: Record<string, string> = {
  ncaa_basketball: "🏀",
  nfl_playoffs: "🏈",
  nba_playoffs: "🏀",
  nhl_playoffs: "🏒",
  soccer: "⚽",
  custom: "🏆",
};

interface TournamentMeta {
  id: string;
  name: string;
  shortName: string;
  sport: string;
  season: string;
  teamCount: number;
  comingSoon?: boolean;
}

export default function HomePage() {
  const [tournaments, setTournaments] = useState<TournamentMeta[]>([]);
  const applyToDOM = useThemeStore((s) => s.applyToDOM);

  useEffect(() => {
    applyToDOM();
    fetch("/api/tournaments")
      .then((r) => r.json())
      .then(setTournaments);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--brand-bg)]" style={{ fontFamily: "var(--brand-font, 'Inter', sans-serif)" }}>
      <header className="bg-[var(--brand-secondary)] text-white px-6 py-4 flex items-center gap-3 shadow-lg">
        <div
          className="w-10 h-11 flex items-center justify-center rounded font-black text-xl"
          style={{ background: "var(--brand-primary)" }}
        >
          F
        </div>
        <div>
          <div className="font-bold text-base tracking-wide">FANDUEL RESEARCH</div>
          <div className="text-white/50 text-[10px] tracking-widest">BRACKET BUILDER</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[var(--brand-text)] mb-2">Pick Your Bracket</h1>
        <p className="text-[var(--brand-muted)] mb-8 text-sm">
          Select a tournament, make your picks, then share or export as PNG / PDF.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {tournaments.map((t) => (
            <div key={t.id} className="relative">
              {t.comingSoon ? (
                <div className="rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-surface)] p-5 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{SPORT_ICONS[t.sport] ?? "🏆"}</span>
                    <div>
                      <div className="font-semibold text-[var(--brand-text)] text-sm">{t.shortName}</div>
                      <div className="text-xs text-[var(--brand-muted)]">{t.season} · {t.teamCount} teams</div>
                    </div>
                  </div>
                  <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider bg-[var(--brand-muted)]/20 text-[var(--brand-muted)] px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                </div>
              ) : (
                <Link
                  href={`/bracket/${t.id}`}
                  className="block rounded-xl border-2 border-[var(--brand-primary)]/30 bg-[var(--brand-surface)] p-5 hover:border-[var(--brand-primary)] hover:shadow-md transition-all no-underline group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{SPORT_ICONS[t.sport] ?? "🏆"}</span>
                    <div>
                      <div className="font-semibold text-[var(--brand-text)] text-sm group-hover:text-[var(--brand-primary)] transition-colors">
                        {t.shortName}
                      </div>
                      <div className="text-xs text-[var(--brand-muted)]">{t.season} · {t.teamCount} teams</div>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-[var(--brand-primary)]">Make your picks →</div>
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 p-5 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-surface)]">
          <h2 className="font-bold text-[var(--brand-text)] text-sm mb-2">Embed on your site</h2>
          <p className="text-xs text-[var(--brand-muted)] mb-3">Drop a live bracket into any page with one iframe:</p>
          <pre className="bg-[var(--brand-bg)] rounded p-3 text-[10px] text-[var(--brand-text)] overflow-x-auto whitespace-pre-wrap">
{`<iframe
  src="https://YOUR-DOMAIN/embed/ncaa-basketball-2026"
  width="100%" height="600"
  frameborder="0" allow="clipboard-write">
</iframe>`}
          </pre>
          <p className="text-[9px] text-[var(--brand-muted)] mt-2">
            Options: <code>?readOnly=true</code> · <code>?controls=false</code> · <code>?primaryColor=%231066E5</code>
          </p>
        </div>
      </main>
    </div>
  );
}
