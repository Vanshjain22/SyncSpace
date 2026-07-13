"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log exception diagnostics details
    console.error("Next.js Root Boundary caught global error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-[#071017] text-white min-h-screen flex items-center justify-center p-6">
        <div className="text-center p-8 max-w-md space-y-4 rounded-3xl border border-white/5 bg-[#0f1c25]/80 backdrop-blur-xl shadow-2xl">
          <h2 className="text-3xl font-black text-rose-500">Critical Error</h2>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            A critical system exception was intercepted during application layout rendering.
          </p>
          <div className="flex justify-center gap-3 pt-3">
            <Button
              onClick={() => reset()}
              className="bg-[#10b981] hover:bg-[#14b8a6] text-zinc-950 font-bold transition-all px-6"
            >
              Reset Application
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
