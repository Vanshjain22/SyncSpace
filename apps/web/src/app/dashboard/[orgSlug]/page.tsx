import { Suspense } from "react";

import { OrgDashboard } from "./OrgDashboard";

interface OrgDashboardPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function OrgDashboardPage({ params }: OrgDashboardPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading workspace...</p>
        </div>
      }
    >
      <OrgDashboard paramsPromise={params} />
    </Suspense>
  );
}
