import { cookies } from "next/headers";

import { LandingPageClient } from "./LandingPageClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SyncSpace — Modern Team Collaboration Platform",
  description:
    "SyncSpace is a modern team collaboration platform for managing projects, tasks, and real-time communication in one beautiful workspace.",
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("syncspace_has_session");

  return <LandingPageClient hasSession={hasSession} />;
}
