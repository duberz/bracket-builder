"use client";

import { create } from "zustand";
import { FANDUEL_BRAND, type BrandConfig } from "@/types/bracket";

interface ThemeStore {
  brand: BrandConfig;
  setBrand: (b: Partial<BrandConfig>) => void;
  resetBrand: () => void;
  applyToDOM: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  brand: FANDUEL_BRAND,

  setBrand: (b) => {
    set((state) => ({ brand: { ...state.brand, ...b } }));
    get().applyToDOM();
  },

  resetBrand: () => {
    set({ brand: FANDUEL_BRAND });
    get().applyToDOM();
  },

  applyToDOM: () => {
    if (typeof document === "undefined") return;
    const { brand } = get();
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", brand.primaryColor);
    root.style.setProperty("--brand-secondary", brand.secondaryColor);
    root.style.setProperty("--brand-bg", brand.backgroundColor);
    root.style.setProperty("--brand-surface", brand.surfaceColor);
    root.style.setProperty("--brand-text", brand.textColor);
    root.style.setProperty("--brand-muted", brand.mutedTextColor);
    root.style.setProperty("--brand-accent", brand.accentColor);
    if (brand.fontFamily) {
      root.style.setProperty("--brand-font", brand.fontFamily);
    }
  },
}));
