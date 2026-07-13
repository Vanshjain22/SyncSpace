import { Suspense } from "react";

import { BoardsListClient } from "./BoardsListClient";

interface BoardsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function BoardsPage({ params }: BoardsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">
            Loading workspace boards...
          </p>
        </div>
      }
    >
      <BoardsListClient paramsPromise={params} />
    </Suspense>
  );
}
