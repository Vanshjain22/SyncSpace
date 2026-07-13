"use client";

import Link from "next/link";
import * as React from "react";

import { type Variants, motion } from "framer-motion";
import { Briefcase, CheckCircle2, TrendingUp, Users } from "lucide-react";

import { Card } from "../ui/card";

interface StatsCardsProps {
  orgSlug: string;
  totalProjects: number;
  completedTasks: number;
  totalTasks: number;
  teamMembers: number;
  productivityScore: number;
}

export function StatsCards({
  orgSlug,
  totalProjects,
  completedTasks,
  teamMembers,
  productivityScore,
}: StatsCardsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* Card 1: Projects */}
      <motion.div variants={itemVariants} className="relative overflow-hidden">
        <Link
          href={`/dashboard/${orgSlug}/projects`}
          className="block focus:outline-none rounded-2xl"
        >
          <Card className="p-5 flex flex-col justify-between group hover:shadow-[0_0_35px_rgba(6,182,212,0.15)] hover:border-cyan-500/25 bg-[#0b131a] border border-white/5 transition-all duration-300 cursor-pointer select-none h-[180px] min-h-[180px]">
            {/* Top row */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Projects
              </span>
            </div>
            {/* Middle row */}
            <div className="my-auto pt-2">
              <span className="text-4xl font-black text-white tracking-tight">{totalProjects}</span>
            </div>
            {/* Bottom row */}
            <div className="flex items-center justify-between w-full mt-auto">
              <span className="text-[10px] text-zinc-450 font-medium">Active Projects</span>
              {/* Decorative mini bar chart */}
              <div className="flex items-end gap-1 h-6">
                <div className="w-1 h-2 bg-cyan-500/30 rounded-full" />
                <div className="w-1 h-4 bg-cyan-500/40 rounded-full" />
                <div className="w-1 h-3 bg-cyan-500/30 rounded-full" />
                <div className="w-1 h-5.5 bg-cyan-500/70 rounded-full" />
                <div className="w-1 h-5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.3)]" />
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Card 2: Completed Tasks */}
      <motion.div variants={itemVariants} className="relative overflow-hidden">
        <Link
          href={`/dashboard/${orgSlug}/tasks?status=Done`}
          className="block focus:outline-none rounded-2xl"
        >
          <Card className="p-5 flex flex-col justify-between group hover:shadow-[0_0_35px_rgba(16,185,129,0.15)] hover:border-emerald-500/25 bg-[#0b131a] border border-white/5 transition-all duration-300 cursor-pointer select-none h-[180px] min-h-[180px]">
            {/* Top row */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Completed Tasks
              </span>
            </div>
            {/* Middle row */}
            <div className="my-auto pt-2">
              <span className="text-4xl font-black text-white tracking-tight">
                {completedTasks}
              </span>
            </div>
            {/* Bottom row */}
            <div className="flex items-center justify-between w-full mt-auto">
              <span className="text-[10px] text-zinc-450 font-medium">Tasks Completed</span>
              {/* Decorative wavy trend sparkline */}
              <div className="w-14 h-6 opacity-80 group-hover:opacity-100 transition-opacity">
                <svg className="w-full h-full" viewBox="0 0 100 40">
                  <path
                    d="M0,35 Q25,5 50,25 T100,5"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]"
                  />
                </svg>
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Card 3: Team Members */}
      <motion.div variants={itemVariants} className="relative overflow-hidden">
        <Link
          href={`/dashboard/${orgSlug}/settings`}
          className="block focus:outline-none rounded-2xl"
        >
          <Card className="p-5 flex flex-col justify-between group hover:shadow-[0_0_35px_rgba(244,63,94,0.15)] hover:border-rose-500/25 bg-[#0b131a] border border-white/5 transition-all duration-300 cursor-pointer select-none h-[180px] min-h-[180px]">
            {/* Top row */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Team Members
              </span>
            </div>
            {/* Middle row */}
            <div className="my-auto pt-2">
              <span className="text-4xl font-black text-white tracking-tight">{teamMembers}</span>
            </div>
            {/* Bottom row */}
            <div className="flex items-center justify-between w-full mt-auto">
              <span className="text-[10px] text-zinc-450 font-medium">Active Members</span>
              {/* Overlapping face avatars */}
              <div className="flex items-center -space-x-1.5 mr-1">
                <div className="w-6 h-6 rounded-full bg-blue-500 border border-zinc-950 flex items-center justify-center text-[8px] font-black text-white select-none">
                  JD
                </div>
                <div className="w-6 h-6 rounded-full bg-purple-500 border border-zinc-950 flex items-center justify-center text-[8px] font-black text-white select-none">
                  SC
                </div>
                <div className="w-6 h-6 rounded-full bg-amber-500 border border-zinc-950 flex items-center justify-center text-[8px] font-black text-white select-none">
                  TA
                </div>
                {teamMembers > 3 && (
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-950 flex items-center justify-center text-[7px] font-black text-zinc-400 select-none">
                    +{teamMembers - 3}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Card 4: Productivity Score */}
      <motion.div variants={itemVariants} className="relative overflow-hidden">
        <Link
          href={`/dashboard/${orgSlug}/analytics`}
          className="block focus:outline-none rounded-2xl"
        >
          <Card className="p-5 flex flex-col justify-between group hover:shadow-[0_0_35px_rgba(245,158,11,0.15)] hover:border-amber-500/25 bg-[#0b131a] border border-white/5 transition-all duration-300 cursor-pointer select-none h-[180px] min-h-[180px]">
            {/* Top row */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Productivity Score
              </span>
            </div>
            {/* Middle row */}
            <div className="my-auto pt-2">
              <span className="text-4xl font-black text-white tracking-tight">
                {productivityScore}%
              </span>
            </div>
            {/* Bottom row */}
            <div className="flex items-center justify-between w-full mt-auto">
              <span className="text-[10px] text-zinc-450 font-medium">Keep it up! 🚀</span>
              {/* Circular Progress Ring */}
              <div className="w-8 h-8 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 mr-1">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="16"
                    cy="16"
                    r="13"
                    stroke="currentColor"
                    className="text-zinc-850"
                    strokeWidth="2.5"
                    fill="transparent"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="13"
                    stroke="currentColor"
                    className="text-amber-500 filter drop-shadow-[0_0_2px_rgba(245,158,11,0.4)]"
                    strokeWidth="2.5"
                    fill="transparent"
                    strokeDasharray="81.6"
                    strokeDashoffset={`${81.6 - (81.6 * productivityScore) / 100}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[7px] font-black text-white">
                  {productivityScore}%
                </span>
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>
    </motion.div>
  );
}
