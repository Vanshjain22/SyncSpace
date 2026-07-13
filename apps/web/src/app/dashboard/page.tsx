"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";

import { type ApiResponse } from "@syncspace/shared";

import { api } from "@/lib/api-client";
import { useOrgStore } from "@/stores/org.store";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  website?: string | null;
  role?: string;
}

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { setOrganizations } = useOrgStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-organizations"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Organization[]>>("/organizations");
      return res.data;
    },
    retry: 1,
  });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isError || !data) {
      // If error (e.g. unauthorized), fallback to new org setup or login
      router.push("/orgs/new");
      return;
    }

    setOrganizations(data);

    if (data && data.length > 0 && data[0]) {
      // Redirect to the first organization's dashboard
      router.push(`/dashboard/${data[0].slug}`);
    } else {
      // Redirect to organization creation flow
      router.push("/orgs/new");
    }
  }, [data, isLoading, isError, router, setOrganizations]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading workspace...</p>
      </div>
    </div>
  );
}
