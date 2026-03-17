"use client";

import { useState } from "react";
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

  const btnClass =
    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50";

  return (
    <div className="flex gap-2">
      <button onClick={() => window.print()} className={btnClass}>
        Print
      </button>
      <button onClick={handlePng} disabled={!!loading} className={btnClass}>
        {loading === "png" ? <span className="animate-spin inline-block">⏳</span> : null}
        PNG
      </button>
      <button onClick={handlePdf} disabled={!!loading} className={btnClass}>
        {loading === "pdf" ? <span className="animate-spin inline-block">⏳</span> : null}
        PDF
      </button>
    </div>
  );
}
