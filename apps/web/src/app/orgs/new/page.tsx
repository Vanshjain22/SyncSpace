import type { Metadata } from "next";
import { Suspense } from "react";

import { NewOrgForm } from "./NewOrgForm";

export const metadata: Metadata = {
  title: "Create a new organization",
  description: "Set up your brand new team workspace on SyncSpace",
};

export default function NewOrgPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center min-h-[350px]">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
            </div>
          }
        >
          <NewOrgForm />
        </Suspense>
      </div>
    </div>
  );
}
