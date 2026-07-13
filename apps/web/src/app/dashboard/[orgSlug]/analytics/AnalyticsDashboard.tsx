"use client";

import Link from "next/link";
import React, { use, useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BarChart3,
  Brain,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Flame,
  Layers,
  ListTodo,
  PieChart as PieIcon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as ChartTooltip,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { type ApiResponse } from "@syncspace/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useOrgStore } from "@/stores/org.store";

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface AnalyticsData {
  projectName: string;
  statusCounts: {
    BACKLOG: number;
    TODO: number;
    IN_PROGRESS: number;
    IN_REVIEW: number;
    DONE: number;
  };
  priorityCounts: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    URGENT: number;
  };
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
}

interface AnalyticsDashboardProps {
  paramsPromise: Promise<{ orgSlug: string }>;
}

export function AnalyticsDashboard({ paramsPromise }: AnalyticsDashboardProps) {
  const params = use(paramsPromise);
  const orgSlug = params.orgSlug;

  const { currentOrganization } = useOrgStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"visuals" | "audit">("visuals");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Fetch organization projects
  const orgId = currentOrganization?.id;
  const projectsQuery = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project[]>>(`/projects/org/${orgId}`);
      return res.data;
    },
    enabled: !!orgId,
  });

  const projects = projectsQuery.data || [];

  // Auto-select the first project once loaded
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      const firstProj = projects[0];
      if (firstProj) {
        setSelectedProjectId(firstProj.id);
      }
    }
  }, [projects, selectedProjectId]);

  // 2. Fetch analytics for selected project
  const analyticsQuery = useQuery({
    queryKey: ["analytics", selectedProjectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AnalyticsData>>(
        `/analytics/project/${selectedProjectId}`,
      );
      return res.data;
    },
    enabled: !!selectedProjectId,
  });

  const stats = analyticsQuery.data;

  // Completion percentage
  const completionRate =
    stats && stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  // SVG Gauge calculations
  const radius = 52;
  const circumference = 2 * Math.PI * radius; // ~326.7
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  // Priority color definitions
  const priorityColors = {
    LOW: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
    MEDIUM: "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]",
    HIGH: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
    URGENT: "bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]",
  };

  const statusPieColors = ["#94a3b8", "#06b6d4", "#f59e0b", "#14b8a6", "#10b981"];

  // Resolve health level
  const getProjectHealth = () => {
    if (!stats || stats.totalTasks === 0) {
      return {
        label: "Unknown Health Status",
        description: "No tasks found to analyze project health status metrics.",
        colorClass: "text-[#94a3b8]",
        bgClass: "bg-white/5 border-white/5 text-[#94a3b8]",
        icon: <ShieldQuestion className="h-6 w-6 text-[#94a3b8]" />,
        badge: "N/A",
        score: 0,
      };
    }

    const urgentCount = stats.priorityCounts.URGENT || 0;
    const backlogRatio = stats.statusCounts.BACKLOG / stats.totalTasks;

    if (completionRate >= 75 && urgentCount === 0) {
      return {
        label: "Optimal Health",
        description: "Outstanding completion rates and zero blockages. Velocity is at its highest.",
        colorClass: "text-[#10b981]",
        bgClass: "bg-[#10b981]/10 border-[#10b981]/20 text-emerald-300",
        icon: <ShieldCheck className="h-6 w-6 text-[#10b981]" />,
        badge: "Optimal",
        score: 96,
      };
    }

    if (urgentCount > 2 || backlogRatio > 0.5 || completionRate < 35) {
      return {
        label: "Needs Review",
        description:
          "High backlog density or multiple critical open blockers require immediate redistribution.",
        colorClass: "text-[#f43f5e]",
        bgClass: "bg-[#f43f5e]/10 border-[#f43f5e]/20 text-rose-300",
        icon: <ShieldAlert className="h-6 w-6 text-[#f43f5e]" />,
        badge: "Critical",
        score: 42,
      };
    }

    return {
      label: "Healthy & Stable",
      description:
        "Consistent workload pacing. Task movement fits typical sprint velocity parameters.",
      colorClass: "text-[#06b6d4]",
      bgClass: "bg-[#06b6d4]/10 border-[#06b6d4]/20 text-cyan-300",
      icon: <ShieldCheck className="h-6 w-6 text-[#06b6d4]" />,
      badge: "Stable",
      score: 78,
    };
  };

  const health = getProjectHealth();

  const handleRefresh = () => {
    setIsRefreshing(true);
    analyticsQuery.refetch().finally(() => {
      setTimeout(() => setIsRefreshing(false), 800);
    });
  };

  // Mock data for Line area chart - responds to selected project completion rate
  const getVelocityData = () => {
    const scale = stats ? stats.totalTasks * 5 : 50;
    return [
      {
        name: "Sprint 1",
        completed: Math.round(scale * 0.2),
        active: Math.round(scale * 0.4),
        efficiency: 70,
      },
      {
        name: "Sprint 2",
        completed: Math.round(scale * 0.35),
        active: Math.round(scale * 0.5),
        efficiency: 75,
      },
      {
        name: "Sprint 3",
        completed: Math.round(scale * 0.5),
        active: Math.round(scale * 0.3),
        efficiency: 82,
      },
      {
        name: "Sprint 4",
        completed: Math.round(scale * 0.68),
        active: Math.round(scale * 0.2),
        efficiency: 88,
      },
      {
        name: "Sprint 5",
        completed: stats ? stats.completedTasks : 45,
        active: stats ? stats.openTasks : 15,
        efficiency: completionRate || 80,
      },
    ];
  };

  const getBurndownData = () => {
    const total = stats ? stats.totalTasks : 20;
    return [
      { day: "Day 1", remaining: total, ideal: total },
      { day: "Day 3", remaining: Math.round(total * 0.85), ideal: Math.round(total * 0.8) },
      { day: "Day 5", remaining: Math.round(total * 0.65), ideal: Math.round(total * 0.6) },
      { day: "Day 7", remaining: Math.round(total * 0.45), ideal: Math.round(total * 0.4) },
      { day: "Day 9", remaining: Math.round(total * 0.25), ideal: Math.round(total * 0.2) },
      { day: "Day 10", remaining: stats ? stats.openTasks : 0, ideal: 0 },
    ];
  };

  const getStatusPieData = () => {
    if (!stats) {
      return [];
    }
    return [
      { name: "Backlog", value: stats.statusCounts.BACKLOG },
      { name: "To Do", value: stats.statusCounts.TODO },
      { name: "In Progress", value: stats.statusCounts.IN_PROGRESS },
      { name: "In Review", value: stats.statusCounts.IN_REVIEW },
      { name: "Done", value: stats.statusCounts.DONE },
    ].filter((d) => d.value > 0);
  };

  return (
    <div className="relative min-h-screen bg-[#071017] text-white overflow-hidden pb-12 pr-4 pl-4 md:pr-6 md:pl-6 pt-6">
      {/* Background radial glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full bg-[#10b981]/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#06b6d4]/5 blur-[120px] pointer-events-none z-0" />

      {/* Main Grid Wrapper */}
      <div className="relative z-10 space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Actions Top Header */}
        <div className="flex flex-col gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Link
                href={`/dashboard/${orgSlug}`}
                className="text-[#94a3b8] hover:text-white flex items-center gap-1.5 transition-colors font-bold uppercase tracking-wider"
              >
                <ArrowLeft className="h-4.5 w-4.5" /> Back to Workspace
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="h-9 px-3 border-white/5 bg-[#0f1c25]/30 hover:bg-[#0f1c25]/60 hover:text-white transition-all text-xs font-bold"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin text-[#10b981]" : ""}`}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 border-white/5 bg-[#0f1c25]/30 hover:bg-[#0f1c25]/60 hover:text-white transition-all text-xs font-bold"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export PDF
              </Button>
              <Button variant="primary" size="sm" className="h-9 px-3.5 text-xs font-bold">
                <Brain className="h-4 w-4 mr-1.5 text-zinc-950" />
                Generate AI Report
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-[#10b981]" />
                Workspace Analytics
              </h1>
              <p className="text-[#94a3b8] text-sm mt-1 font-medium">
                Track project health, team productivity, and AI-driven sprint diagnostics.
              </p>
            </div>

            {/* Project Selector Switcher */}
            {projects.length > 0 && (
              <div className="relative w-72 shrink-0">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full flex h-11 items-center justify-between rounded-2xl border border-white/5 bg-[#0f1c25] hover:bg-[#0f1c25]/80 px-4 py-2.5 text-sm shadow-md transition-colors focus:outline-none focus:border-[#10b981]/50 cursor-pointer font-bold text-white uppercase tracking-wider"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id} className="bg-[#0f1c25] text-white">
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-3xl border border-white/5 p-16 text-center max-w-xl mx-auto bg-[#0f1c25]/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-5 border border-white/10 text-[#94a3b8]">
              <ListTodo className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-extrabold mb-2.5 text-white">No projects to analyze</h3>
            <p className="text-sm text-[#94a3b8] max-w-sm mx-auto leading-relaxed">
              Create your first project in the settings or workflow panel to view dashboard velocity
              analytics.
            </p>
            <Button
              asChild
              variant="primary"
              size="md"
              className="mt-6 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <Link href={`/dashboard/${orgSlug}/settings`}>Create Project</Link>
            </Button>
          </div>
        ) : analyticsQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#10b981] border-t-transparent" />
            <p className="text-sm text-[#94a3b8] font-bold uppercase tracking-wider animate-pulse">
              Running task audit metrics...
            </p>
          </div>
        ) : !stats ? (
          <div className="text-center py-16 text-[#f43f5e] font-extrabold text-lg">
            Failed to fetch active workspace logs.
          </div>
        ) : (
          /* Split Main Content Area */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Metrics & Main Visuals (70%) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Premium overview Hero Card */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-white/5 bg-[#0f1c25]/85 p-6 shadow-xl relative overflow-hidden group hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] transition-all duration-500"
              >
                {/* Abstract Geometric SVG graphic background */}
                <div className="absolute right-0 top-0 bottom-0 w-[45%] pointer-events-none select-none z-0 hidden md:block opacity-35 group-hover:opacity-50 transition-opacity duration-500">
                  <svg
                    className="w-full h-full text-[#10b981]/10"
                    viewBox="0 0 200 150"
                    fill="none"
                  >
                    <circle cx="160" cy="75" r="55" stroke="currentColor" strokeWidth="1.5" />
                    <circle
                      cx="160"
                      cy="75"
                      r="35"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="80"
                      y1="75"
                      x2="160"
                      y2="75"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="5 5"
                    />
                    <path
                      d="M120,40 L160,75 L140,110"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div className="space-y-4 max-w-md">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#10b981]/15 text-[#10b981]">
                        <Award className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-xs font-extrabold uppercase tracking-widest text-[#10b981]">
                        Overview Summary
                      </span>
                    </div>

                    <h2 className="text-2xl font-extrabold text-white leading-tight">
                      Workspace Health: {health.label}
                    </h2>
                    <p className="text-sm text-[#94a3b8] leading-relaxed">{health.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-1">
                      <span className="flex items-center gap-1.5 text-white">
                        <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                        Score: {health.score}/100
                      </span>
                      <span className="text-zinc-700">|</span>
                      <span className="text-[#94a3b8]">Last updated: Just now</span>
                    </div>
                  </div>

                  {/* Circular progress gauge */}
                  <div className="relative h-32 w-32 flex items-center justify-center shrink-0">
                    <svg className="absolute transform -rotate-90 w-full h-full">
                      <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        className="stroke-white/5"
                        strokeWidth="9"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r={radius}
                        className="stroke-[#10b981]"
                        strokeWidth="9"
                        fill="transparent"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="text-center z-10">
                      <span className="text-3xl font-black text-white">{completionRate}%</span>
                      <p className="text-[10px] text-[#94a3b8] font-bold tracking-widest uppercase mt-0.5">
                        Velocity
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 6 Grid Metrics cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Open Tasks */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-3xl border border-white/5 bg-[#0f1c25]/85 p-5 shadow-lg relative group transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                      Open Tasks
                    </span>
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                      <Clock className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-white">{stats.openTasks}</span>
                    <span className="text-xs font-bold text-amber-400">Pacing</span>
                  </div>
                  {/* Micro sparkline */}
                  <svg
                    className="w-full h-8 text-amber-500/30 group-hover:text-amber-500/60 mt-3 transition-colors duration-300"
                    viewBox="0 0 100 20"
                    fill="none"
                  >
                    <path
                      d="M0,15 L20,13 L40,16 L60,10 L80,14 L100,5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </motion.div>

                {/* 2. Completed Tasks */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-3xl border border-white/5 bg-[#0f1c25]/85 p-5 shadow-lg relative group transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                      Completed
                    </span>
                    <div className="p-2 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981]">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-white">
                      {stats.completedTasks}
                    </span>
                    <span className="text-xs font-bold text-[#10b981]">↑ {completionRate}%</span>
                  </div>
                  {/* Micro sparkline */}
                  <svg
                    className="w-full h-8 text-[#10b981]/30 group-hover:text-[#10b981]/60 mt-3 transition-colors duration-300"
                    viewBox="0 0 100 20"
                    fill="none"
                  >
                    <path
                      d="M0,18 L20,15 L40,12 L60,8 L80,5 L100,2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </motion.div>

                {/* 3. Backlog Size */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-3xl border border-white/5 bg-[#0f1c25]/85 p-5 shadow-lg relative group transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                      Backlog
                    </span>
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[#06b6d4]">
                      <Layers className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-white">
                      {stats.statusCounts.BACKLOG}
                    </span>
                    <span className="text-xs font-bold text-[#06b6d4]">Piles</span>
                  </div>
                  {/* Micro sparkline */}
                  <svg
                    className="w-full h-8 text-cyan-500/30 group-hover:text-cyan-500/60 mt-3 transition-colors duration-300"
                    viewBox="0 0 100 20"
                    fill="none"
                  >
                    <path
                      d="M0,8 L20,12 L40,7 L60,11 L80,14 L100,9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </motion.div>

                {/* 4. Completion Velocity */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-3xl border border-white/5 bg-[#0f1c25]/85 p-5 shadow-lg relative group transition-all duration-300 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                      Velocity
                    </span>
                    <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                      <TrendingUp className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-white">{completionRate}%</span>
                    <span className="text-xs font-bold text-teal-400">↑ 18%</span>
                  </div>
                  {/* Micro sparkline */}
                  <svg
                    className="w-full h-8 text-teal-500/30 group-hover:text-teal-400/60 mt-3 transition-colors duration-300"
                    viewBox="0 0 100 20"
                    fill="none"
                  >
                    <path
                      d="M0,16 L25,14 L50,11 L75,7 L100,2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </motion.div>

                {/* 5. Overdue Items */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-3xl border border-white/5 bg-[#0f1c25]/85 p-5 shadow-lg relative group transition-all duration-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                      Overdue
                    </span>
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[#f43f5e]">
                      <Flame className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-white">
                      {stats.priorityCounts.URGENT > 0 ? stats.priorityCounts.URGENT : 0}
                    </span>
                    <span className="text-xs font-bold text-[#f43f5e]">Urgent</span>
                  </div>
                  {/* Micro sparkline */}
                  <svg
                    className="w-full h-8 text-rose-500/30 group-hover:text-[#f43f5e]/60 mt-3 transition-colors duration-300"
                    viewBox="0 0 100 20"
                    fill="none"
                  >
                    <path
                      d="M0,6 L20,12 L40,5 L60,11 L80,4 L100,16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </motion.div>

                {/* 6. Process Efficiency */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-3xl border border-white/5 bg-[#0f1c25]/85 p-5 shadow-lg relative group transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                      Efficiency
                    </span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#10b981]">
                      <Zap className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-white">94%</span>
                    <span className="text-xs font-bold text-[#10b981]">Optimal</span>
                  </div>
                  {/* Micro sparkline */}
                  <svg
                    className="w-full h-8 text-[#10b981]/30 group-hover:text-[#10b981]/60 mt-3 transition-colors duration-300"
                    viewBox="0 0 100 20"
                    fill="none"
                  >
                    <path
                      d="M0,15 Q25,5 50,15 T100,5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </motion.div>
              </div>

              {/* Tab Selector Controls */}
              <div className="flex border-b border-white/5 gap-6 select-none pt-2">
                <button
                  onClick={() => setActiveTab("visuals")}
                  className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative focus:outline-none flex items-center gap-2 ${
                    activeTab === "visuals"
                      ? "text-white font-extrabold"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <PieIcon className="h-4.5 w-4.5 text-[#10b981]" />
                  Visual Charts
                  {activeTab === "visuals" && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative focus:outline-none flex items-center gap-2 ${
                    activeTab === "audit"
                      ? "text-white font-extrabold"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <FileText className="h-4.5 w-4.5 text-[#10b981]" />
                  Project Audit Report
                  {activeTab === "audit" && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]"
                    />
                  )}
                </button>
              </div>

              {/* Tab Content Display */}
              <AnimatePresence mode="wait">
                {activeTab === "visuals" ? (
                  <motion.div
                    key="visuals"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Main Analytics Area: Charts section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* 1. Velocity Area/Line Chart */}
                      <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                            <TrendingUp className="h-4.5 w-4.5 text-[#10b981]" />
                            Velocity Trend
                          </h3>
                          <span className="text-[10px] font-bold text-[#10b981] bg-[#10b981]/15 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <div className="w-full h-52 pt-4 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getVelocityData()}>
                              <defs>
                                <linearGradient id="glowVelocity" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.03)"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="name"
                                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <ChartTooltip
                                contentStyle={{
                                  backgroundColor: "#0f1c25",
                                  border: "1px solid rgba(255, 255, 255, 0.08)",
                                  borderRadius: "16px",
                                  fontSize: "12px",
                                  color: "#fff",
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="completed"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                fill="url(#glowVelocity)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      {/* 2. Sprint Burndown */}
                      <Card className="p-6 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-shadow duration-300">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                            <Flame className="h-4.5 w-4.5 text-[#06b6d4]" />
                            Sprint Burndown
                          </h3>
                          <span className="text-[10px] font-bold text-[#06b6d4] bg-[#06b6d4]/15 px-2 py-0.5 rounded-full">
                            Remaining
                          </span>
                        </div>
                        <div className="w-full h-52 pt-4 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getBurndownData()}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.03)"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="day"
                                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <ChartTooltip
                                contentStyle={{
                                  backgroundColor: "#0f1c25",
                                  border: "1px solid rgba(255, 255, 255, 0.08)",
                                  borderRadius: "16px",
                                  fontSize: "12px",
                                  color: "#fff",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="remaining"
                                stroke="#06b6d4"
                                strokeWidth={2.5}
                                dot={{ fill: "#06b6d4", r: 4 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="ideal"
                                stroke="#94a3b8"
                                strokeDasharray="5 5"
                                strokeWidth={1.5}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      {/* 3. Task Priority Breakdown */}
                      <Card className="p-6 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] transition-shadow duration-300">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                            <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
                            Priority Distribution
                          </h3>
                        </div>
                        <div className="w-full h-52 pt-4 relative">
                          {stats.totalTasks === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-[#94a3b8]/50 italic">
                              No priority items log.
                            </div>
                          ) : (
                            <div className="space-y-3.5">
                              {Object.entries(stats.priorityCounts).map(([priority, count]) => {
                                const percent =
                                  stats.totalTasks > 0
                                    ? Math.round((count / stats.totalTasks) * 100)
                                    : 0;
                                const colClass =
                                  priorityColors[priority as keyof typeof priorityColors] ||
                                  "bg-[#94a3b8]";
                                return (
                                  <div key={priority} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                      <span className="text-[#94a3b8] uppercase tracking-wider">
                                        {priority}
                                      </span>
                                      <span className="text-white">
                                        {count} ({percent}%)
                                      </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${colClass}`}
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* 4. Status Distribution Pie */}
                      <Card className="p-6 hover:shadow-[0_0_30px_rgba(20,184,166,0.1)] transition-shadow duration-300">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                            <PieIcon className="h-4.5 w-4.5 text-teal-400" />
                            Status Distribution
                          </h3>
                        </div>
                        <div className="w-full h-52 pt-4 flex items-center justify-between gap-4">
                          {stats.totalTasks === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-xs text-[#94a3b8]/50 italic">
                              No status metrics.
                            </div>
                          ) : (
                            <>
                              <div className="w-[50%] h-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={getStatusPieData()}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={36}
                                      outerRadius={56}
                                      paddingAngle={3}
                                      dataKey="value"
                                    >
                                      {getStatusPieData().map((entry, index) => (
                                        <Cell
                                          key={`cell-${index}`}
                                          fill={statusPieColors[index % statusPieColors.length]}
                                        />
                                      ))}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="w-[50%] space-y-1.5 pr-2">
                                {getStatusPieData().map((entry, index) => (
                                  <div
                                    key={entry.name}
                                    className="flex items-center justify-between text-xs font-semibold"
                                  >
                                    <span className="flex items-center gap-1.5 text-[#94a3b8] truncate">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{
                                          backgroundColor:
                                            statusPieColors[index % statusPieColors.length],
                                        }}
                                      />
                                      {entry.name}
                                    </span>
                                    <span className="text-white font-bold">{entry.value}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </Card>

                      {/* 5. Workload Heatmap */}
                      <Card className="p-6 sm:col-span-2 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                            <Layers className="h-4.5 w-4.5 text-[#10b981]" />
                            Workload Density Heatmap
                          </h3>
                        </div>
                        <div className="pt-5 overflow-x-auto">
                          <div className="min-w-[480px] grid grid-cols-8 gap-2 text-center text-xs font-bold">
                            <span />
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                              <span key={d} className="text-[#94a3b8] uppercase tracking-wider">
                                {d}
                              </span>
                            ))}

                            {["09:00", "12:00", "15:00", "18:00"].map((time, rowIdx) => {
                              const densities = [
                                [10, 40, 70, 20, 50, 10, 5],
                                [30, 80, 50, 60, 40, 15, 0],
                                [60, 90, 80, 70, 60, 20, 5],
                                [20, 50, 40, 30, 80, 10, 10],
                              ];
                              const rowData = densities[rowIdx] ?? [0, 0, 0, 0, 0, 0, 0];
                              return (
                                <React.Fragment key={time}>
                                  <span className="text-[#94a3b8] py-1 text-left">{time}</span>
                                  {rowData.map((val, cellIdx) => {
                                    let bg = "bg-white/5";
                                    let border = "border-white/5";
                                    if (val >= 70) {
                                      bg =
                                        "bg-[#10b981] text-zinc-950 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
                                      border = "border-[#10b981]/40";
                                    } else if (val >= 40) {
                                      bg = "bg-[#10b981]/50 text-white";
                                      border = "border-[#10b981]/25";
                                    } else if (val >= 20) {
                                      bg = "bg-[#10b981]/20 text-[#10b981]";
                                      border = "border-[#10b981]/10";
                                    }
                                    return (
                                      <div
                                        key={cellIdx}
                                        className={`p-2.5 rounded-xl border font-black text-xs transition-all duration-300 hover:scale-105 ${bg} ${border}`}
                                        title={`${val}% Activity`}
                                      >
                                        {val}%
                                      </div>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      </Card>

                      {/* 6. Weekly Productivity Bar Chart */}
                      <Card className="p-6 sm:col-span-2 hover:shadow-[0_0_30px_rgba(20,184,166,0.1)] transition-shadow duration-300">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                            <Zap className="h-4.5 w-4.5 text-teal-400" />
                            Weekly Completion Rate
                          </h3>
                        </div>
                        <div className="w-full h-52 pt-4 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getVelocityData()}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.03)"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="name"
                                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <ChartTooltip
                                contentStyle={{
                                  backgroundColor: "#0f1c25",
                                  border: "1px solid rgba(255, 255, 255, 0.08)",
                                  borderRadius: "16px",
                                  fontSize: "12px",
                                  color: "#fff",
                                }}
                              />
                              <Bar dataKey="completed" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="audit"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Project Audit Panel */}
                    <Card className="p-6 hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] transition-shadow duration-300">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${health.colorClass}`}
                          >
                            {health.icon}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
                              Project Risk Audit
                            </span>
                            <h3 className="text-lg font-extrabold text-white">{health.label}</h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-3xl font-black text-white">{health.score}%</span>
                          <Button size="sm" variant="primary" className="font-bold text-xs">
                            Generate Detailed Audit
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {/* Strengths */}
                        <div className="space-y-3.5">
                          <h4 className="text-xs font-black text-[#10b981] uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                            Operational Strengths
                          </h4>
                          <ul className="space-y-2.5 text-xs text-[#94a3b8] font-semibold">
                            <li className="flex items-start gap-2">
                              <ChevronRight className="h-4.5 w-4.5 text-[#10b981] shrink-0 mt-0.5" />
                              Task completion velocities show consistency inside final review
                              stages.
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="h-4.5 w-4.5 text-[#10b981] shrink-0 mt-0.5" />
                              Backlog columns size remains within threshold limits.
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="h-4.5 w-4.5 text-[#10b981] shrink-0 mt-0.5" />
                              High prioritizations align with key team member workload
                              distributions.
                            </li>
                          </ul>
                        </div>

                        {/* Weaknesses / Risks */}
                        <div className="space-y-3.5">
                          <h4 className="text-xs font-black text-[#f43f5e] uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
                            Active Risk Indicators
                          </h4>
                          <ul className="space-y-2.5 text-xs text-[#94a3b8] font-semibold">
                            {stats.priorityCounts.URGENT > 2 ? (
                              <li className="flex items-start gap-2 text-rose-300">
                                <AlertCircle className="h-4.5 w-4.5 text-[#f43f5e] shrink-0 mt-0.5" />
                                High count of URGENT tasks present; potential bottleneck in code
                                review.
                              </li>
                            ) : (
                              <li className="flex items-start gap-2">
                                <ChevronRight className="h-4.5 w-4.5 text-zinc-500 shrink-0 mt-0.5" />
                                Urgent priority markers remain at minimal limits.
                              </li>
                            )}
                            <li className="flex items-start gap-2">
                              <ChevronRight className="h-4.5 w-4.5 text-zinc-500 shrink-0 mt-0.5" />
                              Sprint burndowns indicate minor delays in mid-sprint documentation
                              reviews.
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="h-4.5 w-4.5 text-zinc-500 shrink-0 mt-0.5" />
                              In-Review stage cycle times are slightly elevated.
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* AI Recommendations */}
                      <div className="mt-6 p-4 rounded-2xl bg-[#0f1c25] border border-white/5">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                          <Brain className="h-4.5 w-4.5 text-[#10b981]" />
                          AI Recommendations Models
                        </h4>
                        <p className="text-xs text-[#94a3b8] leading-relaxed font-semibold">
                          {stats.totalTasks === 0
                            ? "Populate Kanban columns to trigger automated action proposals."
                            : stats.priorityCounts.URGENT > 0
                              ? `Resolve the ${stats.priorityCounts.URGENT} URGENT task(s) currently open to clear workflow blockers.`
                              : completionRate < 50
                                ? "Prioritize moving To Do tasks into In Progress to step up team work velocity."
                                : "Workflow logs look perfect. Consider setting up code review milestones to prepare for early deployment distributions."}
                        </p>
                      </div>
                    </Card>

                    {/* Table Metrics summary */}
                    <Card className="p-6 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-shadow duration-300">
                      <h3 className="text-sm font-extrabold text-white mb-4 uppercase tracking-wider">
                        Project Metrics Audit Log
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/5 text-[10px] font-extrabold uppercase text-[#94a3b8] tracking-widest">
                              <th className="pb-3 px-4">Metric Target</th>
                              <th className="pb-3 px-4">Raw Counts</th>
                              <th className="pb-3 px-4">Density Ratio</th>
                              <th className="pb-3 px-4 text-right">Audit Evaluation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-white/80 font-semibold">
                            <tr>
                              <td className="py-3.5 px-4 font-bold text-white">Completed Work</td>
                              <td className="py-3.5 px-4 text-[#10b981] font-bold">
                                {stats.completedTasks} tasks
                              </td>
                              <td className="py-3.5 px-4">{completionRate}% of sprint</td>
                              <td className="py-3.5 px-4 text-right">
                                <Badge
                                  variant="success"
                                  className="text-[10px] uppercase font-bold py-0.5 px-2.5"
                                >
                                  OPTIMAL
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3.5 px-4 font-bold text-white">
                                In Progress Tasks
                              </td>
                              <td className="py-3.5 px-4 text-amber-500 font-bold">
                                {stats.openTasks} tasks
                              </td>
                              <td className="py-3.5 px-4">
                                {stats.totalTasks > 0
                                  ? Math.round((stats.openTasks / stats.totalTasks) * 100)
                                  : 0}
                                % of sprint
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <Badge
                                  variant="warning"
                                  className="text-[10px] uppercase font-bold py-0.5 px-2.5"
                                >
                                  ACTIVE
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3.5 px-4 font-bold text-white">Backlogged Pile</td>
                              <td className="py-3.5 px-4 text-[#06b6d4] font-bold">
                                {stats.statusCounts.BACKLOG} tasks
                              </td>
                              <td className="py-3.5 px-4">
                                {stats.totalTasks > 0
                                  ? Math.round(
                                      (stats.statusCounts.BACKLOG / stats.totalTasks) * 100,
                                    )
                                  : 0}
                                % of sprint
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <Badge
                                  variant="info"
                                  className="text-[10px] uppercase font-bold py-0.5 px-2.5"
                                >
                                  UNSTARTED
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3.5 px-4 font-bold text-white">Urgent Outliers</td>
                              <td className="py-3.5 px-4 text-rose-400 font-bold">
                                {stats.priorityCounts.URGENT} tasks
                              </td>
                              <td className="py-3.5 px-4">
                                {stats.totalTasks > 0
                                  ? Math.round(
                                      (stats.priorityCounts.URGENT / stats.totalTasks) * 100,
                                    )
                                  : 0}
                                % velocity
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {stats.priorityCounts.URGENT > 0 ? (
                                  <Badge
                                    variant="danger"
                                    className="text-[10px] uppercase font-bold py-0.5 px-2.5 animate-pulse"
                                  >
                                    RISK
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="default"
                                    className="text-[10px] uppercase font-bold py-0.5 px-2.5 text-zinc-500 border-zinc-800"
                                  >
                                    NOMINAL
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: AI Insights feed, Sidebar, Timeline (30%) */}
            <div className="space-y-6">
              {/* AI Insights panel */}
              <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-shadow duration-300">
                <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-4">
                  <Brain className="h-5 w-5 text-[#10b981]" />
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    AI Diagnostics
                  </h3>
                </div>

                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-[#10b981]/5 border border-[#10b981]/15 relative">
                    <div className="flex items-center justify-between text-xs font-bold text-[#10b981] mb-1">
                      <span>Productivity Increased</span>
                      <span>+18%</span>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                      Team velocity is up by 18% this week compared to historical sprint baselines.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#06b6d4]/5 border border-[#06b6d4]/15 relative">
                    <div className="flex items-center justify-between text-xs font-bold text-[#06b6d4] mb-1">
                      <span>Blockers Cleared</span>
                      <span>Active</span>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                      All standard dependencies inside Active sprints are clear. No critical paths
                      are blocked.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 relative">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
                      <span>Documentation Check</span>
                      <span>Review Needed</span>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                      3 newly completed components require API descriptions prior to release
                      deployment.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 relative">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-1">
                      <span>Testing Coverage</span>
                      <span>92%</span>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                      Unit test validations checked in by team members grew from 84% to 92%
                      coverage.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Upcoming Deadlines Widget */}
              <Card className="p-6 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-shadow duration-300">
                <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-4">
                  <CalendarIcon className="h-5 w-5 text-amber-500" />
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Upcoming Deadlines
                  </h3>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">QA Verification Pass</p>
                      <p className="text-[10px] text-[#94a3b8]/60 mt-0.5">SyncSpace Core</p>
                    </div>
                    <span className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                      Tomorrow
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">Database Migrations</p>
                      <p className="text-[10px] text-[#94a3b8]/60 mt-0.5">API Integration</p>
                    </div>
                    <span className="text-[#06b6d4] bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                      Jul 14
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">Design Specifications</p>
                      <p className="text-[10px] text-[#94a3b8]/60 mt-0.5">Visual Layouts</p>
                    </div>
                    <span className="text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                      Jul 18
                    </span>
                  </div>
                </div>
              </Card>

              {/* Animated Activity Timeline */}
              <Card className="p-6 hover:shadow-[0_0_30px_rgba(244,63,94,0.15)] transition-shadow duration-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Recent Activity
                  </h3>
                </div>

                <div className="relative pl-3 space-y-4">
                  <div className="absolute left-4.5 top-2.5 bottom-2.5 w-0.5 border-l border-dashed border-white/10" />

                  <div className="relative flex gap-3 z-10 text-xs">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#10b981] border border-white/10 shrink-0 mt-1 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                    <div>
                      <p className="text-white leading-relaxed">
                        <span className="font-bold">Vansh Jain</span> completed task{" "}
                        <span className="text-[#10b981] hover:underline cursor-pointer">
                          Refactor cache rules
                        </span>
                      </p>
                      <span className="text-[10px] text-[#94a3b8]/50 block mt-0.5">3 mins ago</span>
                    </div>
                  </div>

                  <div className="relative flex gap-3 z-10 text-xs">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#06b6d4] border border-white/10 shrink-0 mt-1 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
                    <div>
                      <p className="text-white leading-relaxed">
                        <span className="font-bold">Rohit Sharma</span> moved{" "}
                        <span className="text-[#06b6d4] hover:underline cursor-pointer">
                          API testing logs
                        </span>{" "}
                        to review
                      </p>
                      <span className="text-[10px] text-[#94a3b8]/50 block mt-0.5">1 hr ago</span>
                    </div>
                  </div>

                  <div className="relative flex gap-3 z-10 text-xs">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#f43f5e] border border-white/10 shrink-0 mt-1 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                    <div>
                      <p className="text-white leading-relaxed">
                        <span className="font-bold">Priya Patel</span> commented on{" "}
                        <span className="text-[#f43f5e] hover:underline cursor-pointer">
                          Design specs
                        </span>
                      </p>
                      <span className="text-[10px] text-[#94a3b8]/50 block mt-0.5">4 hrs ago</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
