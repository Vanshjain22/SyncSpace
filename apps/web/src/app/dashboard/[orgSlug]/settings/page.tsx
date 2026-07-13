import { Suspense } from "react";

import { OrgSettings } from "./OrgSettings";

interface OrgSettingsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function OrgSettingsPage({ params }: OrgSettingsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">
            Loading settings panel...
          </p>
        </div>
      }
    >
      <OrgSettings paramsPromise={params} />
    </Suspense>
  );
}
