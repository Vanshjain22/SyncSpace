"use client";

import { AlertOctagon, Calendar, CheckCircle2, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "../ui/card";

interface Task {
  id: string;
  status: string;
  priority: string;
}

interface SprintProgressProps {
  tasks: Task[];
  isLoading?: boolean;
}

export function SprintProgress({ tasks, isLoading }: SprintProgressProps) {
  const totalTasks = tasks.length || 10;
  const completedCount = tasks.filter(
    (t) => t.status === "DONE" || t.status === "COMPLETED",
  ).length;
  const completionPercent = Math.round((completedCount / totalTasks) * 100);
  const blockersCount = tasks.filter(
    (t) => (t.priority === "URGENT" || t.priority === "HIGH") && t.status !== "DONE",
  ).length;

  // Static mock variables matching premium linear/notion diagnostics
  const remainingDays = 6;
  const velocityScore = "+14%";

  // Generate burndown data points dynamically based on actual tasks count
  const burndownData = [
    { day: "Mon", Ideal: totalTasks, Actual: totalTasks },
    { day: "Tue", Ideal: Math.round(totalTasks * 0.85), Actual: Math.round(totalTasks * 0.9) },
    { day: "Wed", Ideal: Math.round(totalTasks * 0.7), Actual: Math.round(totalTasks * 0.75) },
    { day: "Thu", Ideal: Math.round(totalTasks * 0.55), Actual: Math.round(totalTasks * 0.6) },
    {
      day: "Fri",
      Ideal: Math.round(totalTasks * 0.4),
      Actual: Math.max(completedCount, Math.round(totalTasks * 0.45)),
    },
    { day: "Sat", Ideal: Math.round(totalTasks * 0.25), Actual: completedCount },
    { day: "Sun", Ideal: 0, Actual: undefined },
  ];

  if (isLoading) {
    return (
      <Card className="p-6 bg-[#0b131a] border border-white/5 rounded-3xl min-h-[300px] animate-pulse flex items-center justify-center text-sm text-zinc-500 font-bold uppercase">
        Loading Sprint Analytics...
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-[#0b131a] border border-white/5 rounded-3xl relative overflow-hidden select-none shadow-[0_0_50px_rgba(16,185,129,0.01)] transition-shadow duration-300 hover:shadow-[0_0_50px_rgba(16,185,129,0.03)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Section: Stats & Progress Circle */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sprint Progress
            </h2>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Active Sprint Overview
            </h1>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                Remaining
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-white">{remainingDays}</span>
                <span className="text-xs text-zinc-500 font-bold">Days Left</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                Blockers
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={`text-xl font-extrabold ${blockersCount > 0 ? "text-rose-400 font-black" : "text-white"}`}
                >
                  {blockersCount}
                </span>
                <span className="text-xs text-zinc-500 font-bold">Active</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Completed
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-white">{completedCount}</span>
                <span className="text-xs text-zinc-500 font-bold">/{totalTasks} Tasks</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between min-h-[90px]">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                Velocity
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-white">{velocityScore}</span>
                <span className="text-xs text-zinc-500 font-bold">Progressive</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Overall Completion</span>
              <span className="text-emerald-400">{completionPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-[#10b981] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Section: Ideal vs Actual Burndown Chart (2/3 Grid Width) */}
        <div className="lg:col-span-2 flex flex-col justify-between h-[280px] lg:h-auto">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Sprint Burndown Trend (Ideal vs Actual)
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-zinc-500">
                <span className="h-1.5 w-3 bg-zinc-600 rounded-sm inline-block border border-dashed" />
                Ideal Burndown
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-3 bg-emerald-500 rounded-sm inline-block" />
                Actual Remaining
              </span>
            </div>
          </div>

          <div className="flex-1 w-full h-[200px] lg:h-auto min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burndownData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.03)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(12, 25, 34, 0.95)",
                    borderColor: "rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#fff",
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
                  }}
                  itemStyle={{ color: "#fff" }}
                  labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                />
                <Area
                  type="monotone"
                  dataKey="Actual"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorActual)"
                  activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="Ideal"
                  stroke="rgba(255,255,255,0.25)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}
