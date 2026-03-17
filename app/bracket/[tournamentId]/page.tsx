import { Suspense } from "react";
import BracketPageContent from "./BracketPageContent";

export default function BracketPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[var(--brand-bg)]">
          <div className="text-[var(--brand-muted)] animate-pulse text-sm">Loading bracket…</div>
        </div>
      }
    >
      <BracketPageContent />
    </Suspense>
  );
}
