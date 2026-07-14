import { Suspense } from "react";

import { RegisterForm } from "./RegisterForm";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create an account on SyncSpace to collaborate with your team",
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
