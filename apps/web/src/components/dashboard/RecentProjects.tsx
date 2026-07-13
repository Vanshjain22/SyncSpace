"use client";

import Link from "next/link";
import * as React from "react";
import { useState } from "react";

import { motion } from "framer-motion";
import { MoreVertical, Search } from "lucide-react";

import { cn } from "@/lib/utils";

import { Card } from "../ui/card";
import { Progress } from "../ui/progress";

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  progress?: number;
}

interface RecentProjectsProps {
  projects: Project[];
  orgSlug: string;
}

export function RecentProjects({ projects, orgSlug }: RecentProjectsProps) {
  const [search, setSearch] = useState("");

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <Card className="p-6 flex flex-col justify-between space-y-4 hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-shadow duration-300">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-base font-extrabold text-white">Recent Projects</h2>
        <Link
          href={`/dashboard/${orgSlug}/projects`}
          className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] hover:text-white transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Inline Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-[#94a3b8]" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#071017]/40 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#94a3b8]/50 outline-none focus:border-[#10b981]/60 transition-colors"
        />
      </div>

      <div className="space-y-4 flex-1 mt-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-[#94a3b8]/60 italic text-center py-4">No matching projects.</p>
        ) : (
          filtered.slice(0, 5).map((project, index) => {
            const percent = typeof project.progress === "number" ? project.progress : 0;
            const iconColors = [
              "bg-cyan-500/10 text-[#06b6d4] border-cyan-500/20",
              "bg-emerald-500/10 text-[#10b981] border-emerald-500/20",
              "bg-rose-500/10 text-[#f43f5e] border-rose-500/20",
              "bg-amber-500/10 text-[#f59e0b] border-amber-500/20",
            ];
            const gradients = [
              "from-cyan-500 to-blue-500",
              "from-emerald-500 to-teal-500",
              "from-rose-500 to-orange-500",
              "from-amber-500 to-yellow-500",
              "from-pink-500 to-rose-500",
            ];
            const colorClass = iconColors[index % iconColors.length];
            const gradClass = gradients[index % gradients.length];

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-3.5 group/item"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm transition-transform duration-300 group-hover/item:scale-105 border",
                        colorClass,
                      )}
                    >
                      {project.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/${orgSlug}/projects/${project.id}/board`}
                        className="text-sm font-bold text-white hover:text-[#10b981] transition-colors block truncate"
                      >
                        {project.name}
                      </Link>
                      <span className="text-xs text-[#94a3b8]/70 block truncate mt-0.5">
                        {project.description || "Building product features"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-[#94a3b8] shrink-0">
                      {new Date(project.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <button className="text-zinc-500 hover:text-white p-1">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <Progress value={percent} className="h-2" indicatorClassName={gradClass} />
                  <span className="text-xs font-bold text-[#94a3b8] w-8 text-right">
                    {percent}%
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </Card>
  );
}
