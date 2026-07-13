"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log exception diagnostics details
    console.error("Next.js Boundary caught error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] text-center p-6 bg-[#071017] text-white">
      <div className="max-w-md space-y-4 rounded-3xl border border-white/5 bg-[#0f1c25]/80 backdrop-blur-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-rose-500">Something went wrong!</h2>
        <p className="text-sm text-[#94a3b8] leading-relaxed">
          {error.message || "An unexpected error occurred while loading this page view."}
        </p>
        <div className="flex justify-center gap-3 pt-3">
          <Button
            onClick={() => reset()}
            className="bg-[#10b981] hover:bg-[#14b8a6] text-zinc-950 font-bold transition-all px-5"
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="border-white/5 bg-white/5 hover:bg-white/10 text-white font-bold transition-all px-5"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}
