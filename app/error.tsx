"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f7fa] gap-4 px-4">
      <div className="text-center max-w-lg">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-[#0a1929] mb-2">Something went wrong</h2>
        <pre className="text-left text-xs bg-white border border-red-200 rounded-lg p-4 overflow-auto text-red-600 mb-4 max-h-48">
          {error.message}
          {error.stack ? `\n\n${error.stack}` : ""}
        </pre>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#1066E5] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
