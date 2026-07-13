"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, ChevronRight, FolderKanban, Layers, ListTodo, Users } from "lucide-react";

import { type ApiResponse } from "@syncspace/shared";

import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { RecentTasks } from "@/components/dashboard/RecentTasks";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
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

interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  coverColor: string | null;
  createdAt: string;
}

interface OrgDashboardProps {
  paramsPromise: Promise<{ orgSlug: string }>;
}

export function OrgDashboard({ paramsPromise }: OrgDashboardProps) {
  const params = use(paramsPromise);
  const orgSlug = params.orgSlug;
  const { setCurrentOrganization } = useOrgStore();
  const user = useAuthStore((s) => s.user);

  const [bannerOpen, setBannerOpen] = useState(true);

  // Fetch Organization details
  const orgQuery = useQuery({
    queryKey: ["org", orgSlug],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Organization>>(`/organizations/slug/${orgSlug}`);
      return res.data;
    },
    retry: 1,
  });

  useEffect(() => {
    if (orgQuery.data) {
      setCurrentOrganization(orgQuery.data);
    }
  }, [orgQuery.data, setCurrentOrganization]);

  const orgId = orgQuery.data?.id;

  // Fetch Projects in this Organization
  const projectsQuery = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project[]>>(`/projects/org/${orgId}`);
      return res.data;
    },
    enabled: !!orgId,
  });

  // Query workspace members
  const membersQuery = useQuery({
    queryKey: ["members", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown[]>>(`/organizations/${orgId}/members`);
      return res.data;
    },
    enabled: !!orgId,
  });

  // Query organization statistics & activities
  const statsQuery = useQuery({
    queryKey: ["org-stats", orgId],
    queryFn: async () => {
      const res = await api.get<
        ApiResponse<{
          teamMembersCount: number;
          completedTasks: number;
          totalTasks: number;
          productivityScore: number;
          upcomingDeadlines: Array<{
            id: string;
            title: string;
            project: string;
            dueDate: string;
            status: string;
          }>;
          activities: Array<{
            id: string;
            type: "tasks" | "comments" | "files";
            user: string;
            action: string;
            target: string;
            timestamp: number;
          }>;
        }>
      >(`/analytics/org/${orgId}/dashboard-stats`);
      return res.data;
    },
    enabled: !!orgId,
  });

  interface DashboardTask {
    id: string;
    title: string;
    projectName: string;
    status: string;
    priority: string;
    createdAt: string;
    assigneeName?: string | null;
  }

  // Fetch all tasks in the organization
  const tasksQuery = useQuery({
    queryKey: ["org-tasks", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardTask[]>>(`/tasks/org/${orgId}`);
      return res.data;
    },
    enabled: !!orgId,
  });

  const org = orgQuery.data;
  const projects = projectsQuery.data || [];
  const tasks = tasksQuery.data || [];
  const membersCount = statsQuery.data?.teamMembersCount ?? membersQuery.data?.length ?? 8;
  const completedTasks = statsQuery.data?.completedTasks ?? 84;
  const productivityScore = statsQuery.data?.productivityScore ?? 92;
  const activities = statsQuery.data?.activities;

  // Greeting dynamic text
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) {
      return "Good morning";
    }
    if (hr < 17) {
      return "Good afternoon";
    }
    return "Good evening";
  };

  // Loading state
  if (orgQuery.isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (orgQuery.isError || !org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center animate-fade-in">
        <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
          <Briefcase className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Workspace not found</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          This workspace doesn&apos;t exist or you don&apos;t have permission to access it.
        </p>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      {/* Global SVG searchlight beam animations injected */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes lighthouse-sweep {
              0% {
                transform: rotate(20deg) scaleY(0.9) translateX(30px);
                opacity: 0.15;
                filter: blur(6px);
              }
              50% {
                transform: rotate(-10deg) scaleY(1.05) translateX(0px);
                opacity: 0.75;
                filter: blur(3px);
              }
              100% {
                transform: rotate(20deg) scaleY(0.9) translateX(30px);
                opacity: 0.15;
                filter: blur(6px);
              }
            }
            .animate-lighthouse-sweep {
              animation: lighthouse-sweep 8s ease-in-out infinite;
            }
          `,
        }}
      />

      {/* Top Header Greetings */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-[32px] font-bold tracking-tight text-white leading-tight">
          {getGreeting()},{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-extrabold">
            {user?.name || "Vansh"}
          </span>
          ! 👋
        </h1>
        <p className="text-xs text-[#94a3b8] font-semibold">
          Here&apos;s an overview of your workspace activity today.
        </p>
      </div>

      {/* Hero promo banner */}
      <HeroBanner orgSlug={org.slug} bannerOpen={bannerOpen} onClose={() => setBannerOpen(false)} />

      {/* Quick Actions Panel */}
      <div className="space-y-2.5 mt-2">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block select-none">
          Quick Actions
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Create Task */}
          <Link
            href={
              projects.length > 0
                ? `/dashboard/${org.slug}/projects/${projects[0]?.id}/board`
                : `/dashboard/${org.slug}/projects/new`
            }
            className="group relative flex items-center justify-between h-[82px] px-4 rounded-xl border border-white/5 bg-[#0b131a] hover:bg-[#0b131a]/80 hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 select-none cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-[#10b981] group-hover:scale-105 transition-transform duration-300 shrink-0">
                <ListTodo className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-semibold text-white">Create Task</h4>
                  <kbd className="px-1 py-0.2 rounded bg-zinc-950 border border-white/5 text-[8px] font-mono text-zinc-500 group-hover:text-emerald-400 transition-colors">
                    Ctrl + T
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">Add work to a project board</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-650 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Card 2: My Tasks */}
          <Link
            href={`/dashboard/${org.slug}/tasks`}
            className="group relative flex items-center justify-between h-[82px] px-4 rounded-xl border border-white/5 bg-[#0b131a] hover:bg-[#0b131a]/80 hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 select-none cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-[#60a5fa] group-hover:scale-105 transition-transform duration-300 shrink-0">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-white">My Tasks</h4>
                <p className="text-[10px] text-zinc-400">View and filter workspace tasks</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-650 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Card 3: Boards */}
          <Link
            href={`/dashboard/${org.slug}/boards`}
            className="group relative flex items-center justify-between h-[82px] px-4 rounded-xl border border-white/5 bg-[#0b131a] hover:bg-[#0b131a]/80 hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 select-none cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-[#06b6d4] group-hover:scale-105 transition-transform duration-300 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-white">Boards</h4>
                <p className="text-[10px] text-zinc-400">Open your Kanban workspaces</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-650 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Card 4: Invite Member */}
          <Link
            href={`/dashboard/${org.slug}/settings`}
            className="group relative flex items-center justify-between h-[82px] px-4 rounded-xl border border-white/5 bg-[#0b131a] hover:bg-[#0b131a]/80 hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 select-none cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-[#f43f5e] group-hover:scale-105 transition-transform duration-300 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-white">Invite Member</h4>
                <p className="text-[10px] text-zinc-400">Grow your workspace team</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-650 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>

      {/* KPI stats cards row */}
      <StatsCards
        orgSlug={org.slug}
        totalProjects={projects.length}
        completedTasks={completedTasks}
        totalTasks={statsQuery.data?.totalTasks ?? 0}
        teamMembers={membersCount}
        productivityScore={productivityScore}
      />

      {/* Main Content Area: Onboarding vs normal widgets */}
      {projects.length === 0 ? (
        <div className="bg-[#0f1c25]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl space-y-6 animate-fade-in">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight uppercase">
              Get Started with SyncSpace
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Complete these simple steps to configure your new workspace.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div
              className={`p-5 rounded-2xl border transition-all ${projects.length > 0 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-[#071017]/40 border-white/5 text-zinc-300"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Step 1
                </span>
                {projects.length > 0 ? (
                  <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold text-emerald-400">
                    Completed
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#10b981]/15 px-2 py-0.5 rounded-full font-bold text-emerald-400 animate-pulse">
                    Pending
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Create your first project</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Initialize a new project board to map your team objectives.
              </p>
              <Button
                asChild
                variant={projects.length > 0 ? "secondary" : "primary"}
                size="sm"
                className="w-full text-xs font-bold"
              >
                <Link href={`/dashboard/${org.slug}/projects/new`}>Create Project</Link>
              </Button>
            </div>

            {/* Step 2 */}
            <div
              className={`p-5 rounded-2xl border transition-all ${(statsQuery.data?.totalTasks ?? 0) > 0 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-[#071017]/40 border-white/5 text-zinc-300"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Step 2
                </span>
                {(statsQuery.data?.totalTasks ?? 0) > 0 ? (
                  <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold text-emerald-400">
                    Completed
                  </span>
                ) : (
                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full font-bold text-zinc-400">
                    Pending
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Add tasks to your board</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Populate columns, assign members, and build schedules.
              </p>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="w-full text-xs font-bold"
                disabled={projects.length === 0}
              >
                <Link
                  href={
                    projects.length > 0
                      ? `/dashboard/${org.slug}/projects/${projects[0]?.id}/board`
                      : "#"
                  }
                >
                  Add Tasks
                </Link>
              </Button>
            </div>

            {/* Step 3 */}
            <div
              className={`p-5 rounded-2xl border transition-all ${membersCount > 1 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-[#071017]/40 border-white/5 text-zinc-300"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Step 3
                </span>
                {membersCount > 1 ? (
                  <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold text-emerald-400">
                    Completed
                  </span>
                ) : (
                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full font-bold text-zinc-400">
                    Pending
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Invite your team</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Add teammates, request reviews, and collaborate.
              </p>
              <Button asChild variant="secondary" size="sm" className="w-full text-xs font-bold">
                <Link href={`/dashboard/${org.slug}/settings`}>Invite Members</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Grid: split 50/50 on desktop with Recent Tasks & Activity Timeline */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTasks tasks={tasks} orgSlug={org.slug} isLoading={tasksQuery.isLoading} />
          <ActivityTimeline
            orgSlug={org.slug}
            activities={activities}
            isLoading={statsQuery.isLoading}
          />
        </div>
      )}
    </div>
  );
}
