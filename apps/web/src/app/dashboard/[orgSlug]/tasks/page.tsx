import { Suspense } from "react";

import { TasksListClient } from "./TasksListClient";

interface TasksPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function TasksPage({ params }: TasksPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">
            Loading workspace tasks...
          </p>
        </div>
      }
    >
      <TasksListClient paramsPromise={params} />
    </Suspense>
  );
}
