"use client";

import Link from "next/link";
import * as React from "react";

import { motion } from "framer-motion";
import { CheckCircle2, FileText, MessageSquare, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

import { Card } from "../ui/card";

interface Activity {
  id: string | number;
  type: "tasks" | "comments" | "files";
  user: string;
  action: string;
  target: string;
  timestamp: number;
}

interface ActivityTimelineProps {
  orgSlug: string;
  activities?: Activity[];
  isLoading?: boolean;
}

export function ActivityTimeline({ orgSlug, activities, isLoading }: ActivityTimelineProps) {
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) {
      return "just now";
    }
    if (mins < 60) {
      return `${mins}m ago`;
    }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) {
      return `${hrs}h ago`;
    }
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getIcon = (action: string, type: string) => {
    if (action.includes("completed")) {
      return CheckCircle2;
    }
    if (action.includes("commented")) {
      return MessageSquare;
    }
    if (type === "files") {
      return FileText;
    }
    return Plus;
  };

  const getColorClass = (action: string, type: string) => {
    if (action.includes("completed")) {
      return "bg-emerald-500/10 border-emerald-500/20 text-[#10b981]";
    }
    if (action.includes("commented")) {
      return "bg-rose-500/10 border-rose-500/20 text-[#f43f5e]";
    }
    if (type === "files") {
      return "bg-amber-500/10 border-amber-500/20 text-[#f59e0b]";
    }
    return "bg-cyan-500/10 border-cyan-500/20 text-[#06b6d4]";
  };

  const defaultActivities = [
    {
      id: 1,
      type: "tasks" as const,
      user: "Vansh Jain",
      action: "created project",
      target: "Full-stack-project",
      timestamp: Date.now() - 120000,
    },
    {
      id: 2,
      type: "tasks" as const,
      user: "Rohit Sharma",
      action: "completed task",
      target: "Fix authentication bug",
      timestamp: Date.now() - 900000,
    },
    {
      id: 3,
      type: "comments" as const,
      user: "Priya Patel",
      action: "commented on",
      target: "Design System",
      timestamp: Date.now() - 3600000,
    },
    {
      id: 4,
      type: "files" as const,
      user: "Ananya Singh",
      action: "uploaded file",
      target: "requirements.pdf",
      timestamp: Date.now() - 7200000,
    },
  ];

  const currentActivities = activities !== undefined ? activities : defaultActivities;
  const sliced = currentActivities.slice(0, 4);

  return (
    <Card className="p-6 flex flex-col justify-between bg-[#0b131a] border border-white/5 rounded-2xl min-h-[400px] relative select-none">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Activity Feed
          </h2>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 font-bold uppercase text-sm animate-pulse">
            Loading timeline...
          </div>
        ) : sliced.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-bold text-zinc-500">No activity logged yet</p>
          </div>
        ) : (
          <div className="space-y-3.5 mt-2">
            {sliced.map((act) => {
              const Icon = getIcon(act.action, act.type);
              const colorClass = getColorClass(act.action, act.type);
              return (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3.5 px-1 py-2 rounded-xl hover:bg-white/[0.01] transition-colors"
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border mt-0.5",
                      colorClass,
                    )}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white leading-relaxed">
                      <span className="font-bold hover:text-[#10b981] transition-colors">
                        {act.user}
                      </span>{" "}
                      <span className="text-[#94a3b8]">{act.action}</span>{" "}
                      <span className="font-semibold text-zinc-300">{act.target}</span>
                    </p>
                    <span className="text-xs text-zinc-500/60 block mt-0.5 font-bold">
                      {formatTime(act.timestamp)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer view all link */}
      <div className="pt-3.5 border-t border-white/5 mt-auto">
        <Link
          href={`/dashboard/${orgSlug}/analytics`}
          className="text-xs font-black uppercase tracking-widest text-[#10b981] hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          View all →
        </Link>
      </div>
    </Card>
  );
}
