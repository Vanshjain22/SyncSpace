"use client";

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  FolderKanban,
  Layers,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAI } from "@/hooks/useAI";
import { useAuthStore } from "@/stores/auth.store";

interface CountUpProps {
  value: number;
  duration?: number;
}

function CountUp({ value, duration = 600 }: CountUpProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Math.round(value);
    if (start === end) {
      setCount(end);
      return;
    }

    const incrementTime = Math.max(12, Math.floor(duration / Math.max(1, end)));
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{count}</>;
}

interface AIInsightsHeaderProps {
  orgId: string | undefined;
  orgSlug: string;
  onFilterBlocked?: (taskIds: string[] | null) => void;
}

export function AIInsightsHeader({ orgId, orgSlug, onFilterBlocked }: AIInsightsHeaderProps) {
  const router = useRouter();
  const { useOrgAIInsights, pingMember, isPinging } = useAI();
  const { data: insightsData, isLoading, error } = useOrgAIInsights(orgId);
  const user = useAuthStore((s) => s.user);

  const [pingSuccess, setPingSuccess] = useState<string | null>(null);
  const [activeFilterLabel, setActiveFilterLabel] = useState<string | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState("just now");

  // Keep a dynamic time-elapsed counter for "Updated XX seconds ago"
  useEffect(() => {
    let seconds = 0;
    const interval = setInterval(() => {
      seconds += 5;
      if (seconds < 60) {
        setLastUpdatedText(`${seconds} seconds ago`);
      } else {
        const mins = Math.floor(seconds / 60);
        setLastUpdatedText(`${mins}m ago`);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [insightsData]);

  if (error) {
    return (
      <div className="p-6 rounded-3xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
        Failed to load AI Autopilot insights.
      </div>
    );
  }

  const data = insightsData;
  const metrics = data?.metrics;
  const actions = data?.actions || [];
  const bullets = data?.insightsBullets || [];

  const handleActionClick = async (action: any) => {
    setPingSuccess(null);

    if (action.type === "PING_USER") {
      try {
        await pingMember({ userId: action.payload.userId, taskId: action.payload.taskId });
        setPingSuccess(
          `⚡ Sent a workspace ping to ${action.payload.userName} regarding "${action.payload.taskTitle}"!`,
        );
      } catch (err) {
        console.error(err);
      }
    } else if (action.type === "GENERATE_REPORT") {
      router.push(`/dashboard/${orgSlug}/ai-report`);
    } else if (action.type === "FILTER_BLOCKED") {
      if (onFilterBlocked) {
        if (activeFilterLabel === action.label) {
          onFilterBlocked(null);
          setActiveFilterLabel(null);
        } else {
          onFilterBlocked(action.payload.taskIds);
          setActiveFilterLabel(action.label);
        }
      }
    } else if (action.type === "ASK_AI") {
      router.push(`/dashboard/${orgSlug}/ai-report?chat=true`);
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) {
      return "Good Morning";
    }
    if (hr < 17) {
      return "Good Afternoon";
    }
    return "Good Evening";
  };

  const firstName = user?.name ? user.name.split(" ")[0] : "Member";

  // SVG Radial Ring properties
  const productivity = metrics?.productivityScore ?? 100;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (productivity / 100) * circumference;

  // Calculate a mock sprint health score based on active parameters
  const overdueCount = metrics?.overdueTasksCount ?? 0;
  const pendingReviews = metrics?.pendingReviewsCount ?? 0;
  const healthScore = Math.max(
    25,
    Math.min(100, productivity - overdueCount * 5 - pendingReviews * 2),
  );

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#0c1922] via-[#091118] to-[#060b10] p-8 shadow-[0_0_50px_rgba(16,185,129,0.02)] transition-shadow duration-300 hover:shadow-[0_0_50px_rgba(16,185,129,0.05)]">
      {/* Decorative Blur Glow Elements */}
      <div className="absolute -top-12 -left-12 h-52 w-52 rounded-full bg-emerald-500/10 blur-[70px]" />
      <div className="absolute -bottom-12 -right-12 h-52 w-52 rounded-full bg-[#10b981]/5 blur-[70px]" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Side: Diagnostics and summary list (70%) */}
        <div className="flex flex-col justify-between space-y-6 lg:col-span-2">
          <div className="space-y-5">
            <div className="flex items-center gap-2 select-none">
              <div className="flex h-6 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-shadow duration-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Sparkles className="h-3.5 w-3.5 select-none animate-pulse" />
                AI Autopilot
              </div>
              <div className="relative flex h-2.5 w-2.5 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-[#10b981] select-none">
                AI Workspace Overview
              </h2>
              <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-white">
                {getGreeting()}, {firstName} 👋
              </h1>
            </div>

            {isLoading ? (
              <div className="space-y-3 pt-2">
                <Skeleton className="h-5 w-11/12 bg-white/5 rounded-xl" />
                <Skeleton className="h-5 w-4/5 bg-white/5 rounded-xl" />
                <Skeleton className="h-5 w-3/4 bg-white/5 rounded-xl" />
              </div>
            ) : (
              <ul className="space-y-3 pt-2 flex-1 animate-fade-in duration-500">
                {bullets.map((bullet: string, idx: number) => (
                  <li
                    key={idx}
                    style={{ animationDelay: `${idx * 120}ms`, animationFillMode: "both" }}
                    className="flex items-start gap-3 text-sm text-[#94a3b8] transition-all duration-300 hover:translate-x-1 hover:text-white group/bullet animate-fade-in"
                  >
                    <span className="text-[#10b981] mt-2 h-2 w-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.7)] group-hover/bullet:scale-125 transition-transform duration-300" />
                    <span className="leading-7 font-semibold text-slate-300 transition-colors group-hover/bullet:text-white">
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-3">
            {pingSuccess && (
              <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 py-3 rounded-2xl animate-fade-in max-w-xl">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <AlertDescription className="text-sm font-bold">{pingSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-48 bg-white/5 rounded-full" />
                  <Skeleton className="h-9 w-32 bg-white/5 rounded-full" />
                  <Skeleton className="h-9 w-32 bg-white/5 rounded-full" />
                  <Skeleton className="h-9 w-24 bg-white/5 rounded-full" />
                </>
              ) : (
                actions.map((action, i) => {
                  const isPrimary = action.type === "GENERATE_REPORT";
                  const isActiveFilter = activeFilterLabel === action.label;

                  if (isPrimary) {
                    return (
                      <button
                        key={i}
                        onClick={() => handleActionClick(action)}
                        disabled={isPinging}
                        className="group relative flex items-center gap-2 rounded-full px-5 py-2.5 text-[12.5px] font-bold cursor-pointer select-none transition-all duration-200 ease-out
                          bg-[#10b981] text-zinc-950
                          shadow-[0_0_0_1px_rgba(16,185,129,0.5),0_4px_16px_rgba(16,185,129,0.25)]
                          hover:bg-emerald-400
                          hover:shadow-[0_0_0_1px_rgba(16,185,129,0.8),0_6px_24px_rgba(16,185,129,0.35)]
                          hover:-translate-y-[1px]
                          active:translate-y-0 active:shadow-[0_0_0_1px_rgba(16,185,129,0.5),0_2px_8px_rgba(16,185,129,0.2)]
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        {action.label}
                        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleActionClick(action)}
                      disabled={isPinging}
                      className={`group relative flex items-center gap-2 rounded-full border px-4.5 py-2 text-[12px] font-semibold cursor-pointer select-none transition-all duration-200 ease-out
                        ${
                          isActiveFilter
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.25)] -translate-y-[1px]"
                            : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-zinc-200 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                        }
                        active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
                    >
                      {action.label}
                      <ChevronRight
                        className={`h-3.5 w-3.5 transition-all duration-200 ${isActiveFilter ? "rotate-90 text-emerald-400" : "text-zinc-600 group-hover:translate-x-0.5 group-hover:text-zinc-400"}`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Workspace Health Panel (30%) */}
        <div className="rounded-2xl border border-white/5 bg-[#070e13]/40 p-6 flex flex-col justify-between gap-6 relative overflow-hidden backdrop-blur-sm">
          {isLoading ? (
            <div className="flex flex-col gap-5 w-full h-full justify-between">
              <div className="flex items-center justify-between">
                <Skeleton className="h-20 w-20 rounded-full bg-white/5" />
                <Skeleton className="h-10 w-28 bg-white/5 rounded" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-full bg-white/5 rounded" />
                <Skeleton className="h-5 w-5/6 bg-white/5 rounded" />
                <Skeleton className="h-5 w-2/3 bg-white/5 rounded" />
              </div>
            </div>
          ) : (
            <>
              {/* Circular Gauge and Health Score Row */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4.5">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Workspace Health
                  </h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">
                      <CountUp value={healthScore} />
                    </span>
                    <span className="text-sm text-zinc-500 font-bold">/100</span>
                  </div>
                  <span className="inline-block text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold select-none uppercase mt-1">
                    Optimal
                  </span>
                </div>

                {/* SVG Progress Gauge */}
                <div className="flex flex-col items-center">
                  <div className="relative h-20 w-20 flex items-center justify-center">
                    <svg className="h-20 w-20 -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        className="stroke-white/5 fill-none"
                        strokeWidth="5"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        className="stroke-[#10b981] fill-none transition-all duration-1000 ease-out"
                        strokeWidth="5"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-sm font-black text-white">
                        <CountUp value={productivity} />%
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-[#10b981] uppercase tracking-wider mt-2 flex items-center gap-1 select-none">
                    <TrendingUp className="h-3 w-3" />
                    Productivity
                  </span>
                </div>
              </div>

              {/* Compact Statistics list */}
              <div className="space-y-3.5 text-sm font-semibold text-slate-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FolderKanban className="w-4 h-4 text-zinc-500" />
                    <span>Active Projects</span>
                  </div>
                  <span className="text-white font-bold text-base">
                    <CountUp value={metrics?.totalProjects ?? 0} />
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-zinc-500" />
                    <span>Active Tasks</span>
                  </div>
                  <span className="text-white font-bold text-base">
                    <CountUp value={metrics?.totalTasks ?? 0} />
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-zinc-500" />
                    <span>Team Members</span>
                  </div>
                  <span className="text-white font-bold text-base">
                    <CountUp value={metrics?.teamMembersCount ?? 0} />
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileCheck className="w-4 h-4 text-zinc-500" />
                    <span>Pending Reviews</span>
                  </div>
                  <span
                    className={`font-bold text-base ${metrics?.pendingReviewsCount ? "text-amber-400 font-extrabold" : "text-white"}`}
                  >
                    <CountUp value={metrics?.pendingReviewsCount ?? 0} />
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-zinc-500" />
                    <span>Overdue Tasks</span>
                  </div>
                  <span
                    className={`font-bold text-base ${metrics?.overdueTasksCount ? "text-red-400 font-extrabold" : "text-white"}`}
                  >
                    <CountUp value={metrics?.overdueTasksCount ?? 0} />
                  </span>
                </div>
              </div>

              {/* Last analyzed status indicator */}
              <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs text-zinc-500 font-bold select-none uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Last analyzed {lastUpdatedText}
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Activity className="h-3.5 w-3.5" />
                  Live Sync
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
