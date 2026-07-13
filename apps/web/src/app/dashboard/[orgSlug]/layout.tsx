"use client";

import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { type ApiResponse } from "@syncspace/shared";

import { CommandPalette } from "@/components/CommandPalette";
import { HelpModal } from "@/components/dashboard/HelpModal";
import { KeyboardShortcutsModal } from "@/components/dashboard/KeyboardShortcutsModal";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { useOrgStore } from "@/stores/org.store";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params["orgSlug"] as string | undefined;

  const { logout } = useAuth();
  const user = useAuthStore((s) => s.user);
  const { currentOrganization, organizations, setOrganizations, setCurrentOrganization } =
    useOrgStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Query organizations
  const { isLoading } = useQuery({
    queryKey: ["user-organizations"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Organization[]>>("/organizations");
      setOrganizations(res.data);
      if (orgSlug && res.data.length > 0) {
        const matchingOrg = res.data.find((o) => o.slug === orgSlug);
        if (matchingOrg) {
          setCurrentOrganization(matchingOrg);
        }
      }
      return res.data;
    },
    retry: 1,
  });

  const queryClient = useQueryClient();

  const handleOrgChange = (org: Organization) => {
    queryClient.clear();
    setCurrentOrganization(org);
    router.push(`/dashboard/${org.slug}`);
  };

  React.useEffect(() => {
    if (!isLoading && organizations.length > 0 && orgSlug) {
      const hasAccess = organizations.some((o) => o.slug === orgSlug);
      if (!hasAccess && organizations[0]) {
        router.replace(`/dashboard/${organizations[0].slug}`);
      }
    } else if (!isLoading && organizations.length === 0) {
      router.replace("/orgs/new");
    }
  }, [isLoading, organizations, orgSlug, router]);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Escape key closes mobile sidebar drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-[#071017] text-white overflow-hidden font-sans emerald-glow-bg">
      <CommandPalette />
      <KeyboardShortcutsModal />
      <HelpModal />

      {/* Desktop Sidebar */}
      <div className="hidden md:block select-none shrink-0 w-[260px]">
        <Sidebar
          currentOrg={currentOrganization}
          organizations={organizations}
          onOrgChange={handleOrgChange}
          userName={user?.name || "Vansh Jain"}
          userEmail={user?.email || "vansh@example.com"}
          onLogout={logout}
          isLoadingOrgs={isLoading}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-[260px] bg-[#08111a] border-r border-white/5 flex flex-col z-10 animate-slide-in-from-left">
            <Sidebar
              currentOrg={currentOrganization}
              organizations={organizations}
              onOrgChange={handleOrgChange}
              userName={user?.name || "Vansh Jain"}
              userEmail={user?.email || "vansh@example.com"}
              onLogout={logout}
              isLoadingOrgs={isLoading}
              onItemClick={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Pane */}
      <div className="flex-grow flex flex-col min-w-0 overflow-hidden">
        <Topbar
          orgSlug={orgSlug}
          orgName={currentOrganization?.name}
          userInitials={userInitials}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        {/* Main Content viewport */}
        <main className="flex-grow overflow-y-auto p-4 md:p-6.5 max-w-[1500px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
