"use client";

import { useState, useRef } from "react";
import type { BracketCanvasHandle } from "@/components/bracket/BracketCanvas";

interface Props {
  bracketRef: React.RefObject<BracketCanvasHandle | null>;
  tournamentName?: string;
}

export default function ExportMenu({ bracketRef, tournamentName = "bracket" }: Props) {
  const [loading, setLoading] = useState<"png" | "pdf" | null>(null);
  const slug = tournamentName.toLowerCase().replace(/\s+/g, "-");

  const handlePng = async () => {
    const el = bracketRef.current?.getElement();
    if (!el) return;
    setLoading("png");
    try {
      const { exportPng } = await import("@/lib/export/exportPng");
      await exportPng(el, `${slug}.png`);
    } finally {
      setLoading(null);
    }
  };

  const handlePdf = async () => {
    const el = bracketRef.current?.getElement();
    if (!el) return;
    setLoading("pdf");
    try {
      const { exportPdf } = await import("@/lib/export/exportPdf");
      await exportPdf(el, `${slug}.pdf`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePng}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[var(--brand-surface)] border border-[var(--brand-primary)]/30 text-[var(--brand-text)] hover:bg-[var(--brand-primary)] hover:text-white transition-colors disabled:opacity-50"
      >
        {loading === "png" ? (
          <span className="animate-spin">⏳</span>
        ) : (
          <span>🖼</span>
        )}
        PNG
      </button>
      <button
        onClick={handlePdf}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[var(--brand-surface)] border border-[var(--brand-primary)]/30 text-[var(--brand-text)] hover:bg-[var(--brand-primary)] hover:text-white transition-colors disabled:opacity-50"
      >
        {loading === "pdf" ? (
          <span className="animate-spin">⏳</span>
        ) : (
          <span>📄</span>
        )}
        PDF
      </button>
    </div>
  );
}
