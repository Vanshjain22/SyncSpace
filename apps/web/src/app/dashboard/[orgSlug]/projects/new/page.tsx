import { Suspense } from "react";

import { NewProjectForm } from "./NewProjectForm";

interface NewProjectPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function NewProjectPage({ params }: NewProjectPageProps) {
  return (
    <div className="py-6 max-w-lg mx-auto">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[350px]">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <NewProjectForm paramsPromise={params} />
      </Suspense>
    </div>
  );
}
