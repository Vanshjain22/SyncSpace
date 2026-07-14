"use client";

import Link from "next/link";
import * as React from "react";

import { CheckSquare, ListTodo } from "lucide-react";

import { cn } from "@/lib/utils";

import { Card } from "../ui/card";

interface Task {
  id: string;
  title: string;
  projectName: string;
  status: string;
  priority: string;
  createdAt: string;
  assigneeName?: string | null;
}

interface RecentTasksProps {
  tasks: Task[];
  orgSlug: string;
  isLoading?: boolean;
}

export function RecentTasks({ tasks, orgSlug, isLoading }: RecentTasksProps) {
  const getStatusStyle = (status: string) => {
    const s = status.toUpperCase();
    if (s === "DONE" || s === "COMPLETED") {
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    }
    if (s === "IN_PROGRESS" || s === "PROGRESS") {
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    }
    return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  };

  const getStatusLabel = (status: string) => {
    const s = status.toUpperCase();
    if (s === "DONE" || s === "COMPLETED") {
      return "Completed";
    }
    if (s === "IN_PROGRESS" || s === "PROGRESS") {
      return "In Progress";
    }
    return "Pending";
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
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

  // Sort and take top 4 tasks
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <Card className="p-6 flex flex-col justify-between bg-[#0b131a] border border-white/5 rounded-2xl min-h-[400px] relative select-none">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Recent Tasks
          </h2>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 font-bold uppercase text-sm animate-pulse">
            Loading tasks...
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ListTodo className="w-10 h-10 text-zinc-600 mb-2" />
            <p className="text-sm font-bold text-zinc-500">No tasks found</p>
            <p className="text-xs text-zinc-650 mt-1">
              Get started by creating a task in a project board.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="py-3.5 flex items-center justify-between group hover:bg-white/[0.01] px-1 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 shrink-0">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-[240px] group-hover:text-emerald-400 transition-colors">
                      {task.title}
                    </h4>
                    <p className="text-xs text-zinc-500 font-medium truncate block mt-0.5">
                      {task.projectName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 shrink-0">
                  {/* Status Badge */}
                  <span
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full font-bold border",
                      getStatusStyle(task.status),
                    )}
                  >
                    {getStatusLabel(task.status)}
                  </span>

                  {/* Assignee Avatar */}
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black text-[#10b981]">
                    {task.assigneeName
                      ? task.assigneeName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "U"}
                  </div>

                  {/* Date */}
                  <span className="text-xs text-zinc-500/60 font-bold w-12 text-right">
                    {formatRelativeTime(task.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer view all link */}
      <div className="pt-3.5 border-t border-white/5 mt-auto">
        <Link
          href={`/dashboard/${orgSlug}/tasks`}
          className="text-xs font-black uppercase tracking-widest text-[#10b981] hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          View all tasks →
        </Link>
      </div>
    </Card>
  );
}
