"use client";

import { motion } from "framer-motion";
import { CheckSquare } from "lucide-react";
import * as React from "react";

import { Card } from "../ui/card";

import { cn } from "@/lib/utils";

interface DeadlinesProps {
  tasks?: Array<{
    id: string;
    title: string;
    project: string;
    dueDate: string;
    status: string;
  }>;
  isLoading?: boolean;
}

export function Deadlines({ tasks, isLoading }: DeadlinesProps) {
  const formatDueDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getBadgeColorClass = (dueDateStr: string, status: string) => {
    if (status === "DONE") {
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    }
    const d = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    if (d.getTime() < today.getTime()) {
      // Overdue
      return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    }
    if (d.getTime() === today.getTime() || d.getTime() === today.getTime() + 86400000) {
      // Today or Tomorrow
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }
    return "text-[#06b6d4] bg-cyan-500/10 border-cyan-500/20";
  };

  const defaultTasks = [
    {
      id: "1",
      title: "UI/UX Design Review",
      project: "Full-stack-project",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      status: "TODO",
    },
    {
      id: "2",
      title: "API Documentation",
      project: "API Integration",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      status: "TODO",
    },
    {
      id: "3",
      title: "Deploy Release V1",
      project: "SyncSpace Core",
      dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
      status: "TODO",
    },
  ];

  const currentTasks = tasks !== undefined ? tasks : defaultTasks;

  return (
    <Card className="p-6 space-y-4 hover:shadow-[0_0_50px_rgba(245,158,11,0.25)] transition-shadow duration-300">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-[#f59e0b]" />
          Upcoming Deadlines
        </h2>
        <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] cursor-pointer hover:text-white transition-colors">
          View all
        </span>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-24 text-xs font-bold uppercase tracking-wider text-zinc-500 animate-pulse">
            Loading deadlines...
          </div>
        ) : currentTasks.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              No upcoming deadlines
            </p>
          </div>
        ) : (
          currentTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 group hover:border-[#f59e0b]/30 transition-all duration-200 cursor-pointer"
            >
              <div className="min-w-0 pr-2">
                <p className="text-sm font-bold text-white truncate">{task.title}</p>
                <p className="text-xs text-[#94a3b8]/60 truncate mt-1">{task.project}</p>
              </div>
              <span
                className={cn(
                  "text-xs font-bold border px-3 py-1 rounded-full shrink-0",
                  getBadgeColorClass(task.dueDate, task.status),
                )}
              >
                {formatDueDate(task.dueDate)}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </Card>
  );
}
