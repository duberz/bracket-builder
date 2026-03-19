"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tournament, Team, PickMap } from "@/types/bracket";

interface BracketStore {
  tournament: Tournament | null;
  picks: PickMap;
  setTournament: (t: Tournament) => void;
  pick: (matchupId: string, teamId: string) => void;
  clearPick: (matchupId: string) => void;
  reset: () => void;
  // Derived: get the "projected" winner of a matchup (official or user pick)
  getWinner: (matchupId: string) => Team | null;
  // All picks as base64 for URL sharing
  encodePicks: () => string;
  loadPicks: (encoded: string) => void;
}

export const useBracketStore = create<BracketStore>()(
  persist(
    (set, get) => ({
      tournament: null,
      picks: {},

      setTournament: (t) =>
        set({ tournament: t, picks: {} }),

      pick: (matchupId, teamId) =>
        set((state) => {
          const newPicks = { ...state.picks, [matchupId]: teamId };
          // Cascade: clear any downstream picks that depended on the old pick
          if (state.tournament) {
            const oldPickId = state.picks[matchupId];
            if (oldPickId && oldPickId !== teamId) {
              cascadeClear(matchupId, teamId, newPicks, state.tournament);
            }
          }
          return { picks: newPicks };
        }),

      clearPick: (matchupId) =>
        set((state) => {
          const newPicks = { ...state.picks };
          delete newPicks[matchupId];
          if (state.tournament) {
            cascadeClear(matchupId, null, newPicks, state.tournament);
          }
          return { picks: newPicks };
        }),

      reset: () => set({ picks: {} }),

      getWinner: (matchupId) => {
        const { tournament, picks } = get();
        if (!tournament) return null;

        // Handle group advancement slots (e.g. "group-a-1st", "group-a-2nd")
        if (matchupId.startsWith("group-") && tournament.groups) {
          const pickedTeamId = picks[matchupId];
          if (!pickedTeamId) return null;
          for (const g of tournament.groups) {
            const t = g.teams.find((t) => t.id === pickedTeamId);
            if (t) return t;
          }
          return null;
        }

        const matchup = tournament.matchups?.find((m) => m.id === matchupId);
        if (!matchup) return null;
        // Official result takes precedence
        if (matchup.winner) return matchup.winner;
        // User pick
        const pickedId = picks[matchupId];
        if (!pickedId) return null;
        return matchup.teamA?.id === pickedId
          ? matchup.teamA
          : matchup.teamB ?? null;
      },

      encodePicks: () => {
        const { picks } = get();
        try {
          return btoa(JSON.stringify(picks));
        } catch {
          return "";
        }
      },

      loadPicks: (encoded) => {
        try {
          const picks = JSON.parse(atob(encoded)) as PickMap;
          set({ picks });
        } catch {
          // ignore invalid encoded state
        }
      },
    }),
    {
      name: "bracket-picks",
      partialize: (state) => ({ picks: state.picks }),
    }
  )
);

/** Remove downstream picks when a pick changes. */
function cascadeClear(
  matchupId: string,
  newTeamId: string | null,
  picks: PickMap,
  tournament: Tournament
) {
  if (!tournament.matchups) return;
  // Find matchups that have this matchupId as a source
  const downstream = tournament.matchups.filter(
    (m) =>
      m.sourceMatchupIds[0] === matchupId ||
      m.sourceMatchupIds[1] === matchupId
  );
  for (const dm of downstream) {
    const pickedTeamId = picks[dm.id];
    if (pickedTeamId && pickedTeamId !== newTeamId) {
      // The picked team no longer comes from this matchup — clear it
      delete picks[dm.id];
      cascadeClear(dm.id, null, picks, tournament);
    }
  }
}
