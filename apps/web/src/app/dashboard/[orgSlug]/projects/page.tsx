import { Suspense } from "react";

import { ProjectsListClient } from "./ProjectsListClient";

interface ProjectsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function ProjectsPage({ params }: ProjectsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading projects...</p>
        </div>
      }
    >
      <ProjectsListClient paramsPromise={params} />
    </Suspense>
  );
}
