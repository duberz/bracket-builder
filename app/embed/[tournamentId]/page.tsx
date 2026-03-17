import { Suspense } from "react";
import EmbedPageContent from "./EmbedPageContent";

export default function EmbedPage() {
  return (
    <Suspense fallback={null}>
      <EmbedPageContent />
    </Suspense>
  );
}
