import { Suspense } from "react";

import { AIReportClient } from "./AIReportClient";

interface AIReportPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function AIReportPage({ params }: AIReportPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-400 animate-pulse font-medium">
            Loading AI Workspace...
          </p>
        </div>
      }
    >
      <AIReportClient paramsPromise={params} />
    </Suspense>
  );
}
