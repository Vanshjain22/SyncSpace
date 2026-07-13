import { AnalyticsDashboard } from "./AnalyticsDashboard";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function AnalyticsPage({ params }: PageProps) {
  return <AnalyticsDashboard paramsPromise={params} />;
}
export const metadata = {
  title: "Workspace Analytics | SyncSpace",
  description: "View project tasks metrics and completion velocities.",
};
