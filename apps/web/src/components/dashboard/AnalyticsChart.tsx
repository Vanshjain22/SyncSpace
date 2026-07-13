"use client";

import * as React from "react";
import { useEffect, useState } from "react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "../ui/card";

const CHART_DATA = [
  { name: "Week 1", completed: 32, active: 18, comments: 12 },
  { name: "Week 2", completed: 48, active: 25, comments: 22 },
  { name: "Week 3", completed: 40, active: 30, comments: 16 },
  { name: "Week 4", completed: 68, active: 22, comments: 28 },
  { name: "Week 5", completed: 84, active: 32, comments: 35 },
];

export function AnalyticsChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="p-6 flex flex-col justify-between hover:shadow-[0_0_50px_rgba(6,182,212,0.25)] transition-shadow duration-300">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-base font-extrabold text-white">Workspace Analytics</h2>
        <div className="flex items-center gap-3">
          {/* Custom legend */}
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#10b981]">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" /> Completed
            </span>
            <span className="flex items-center gap-1.5 text-[#06b6d4]">
              <span className="w-2 h-2 rounded-full bg-[#06b6d4]" /> Active
            </span>
            <span className="flex items-center gap-1.5 text-[#f43f5e]">
              <span className="w-2 h-2 rounded-full bg-[#f43f5e]" /> Comments
            </span>
          </div>
          <select className="bg-transparent border-0 outline-none text-xs text-[#94a3b8] cursor-pointer font-bold uppercase tracking-wider">
            <option className="bg-[#0f1c25]">This month</option>
            <option className="bg-[#0f1c25]">This quarter</option>
          </select>
        </div>
      </div>

      <div className="relative pt-4 w-full h-[220px]">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={CHART_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradientActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradientComments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.03)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: "bold" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: "bold" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1c25",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#fff",
                }}
                labelStyle={{ color: "#94a3b8", paddingBottom: "4px" }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#gradientCompleted)"
              />
              <Area
                type="monotone"
                dataKey="active"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#gradientActive)"
              />
              <Area
                type="monotone"
                dataKey="comments"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradientComments)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-[#94a3b8]/50 italic">
            Loading metrics...
          </div>
        )}
      </div>
    </Card>
  );
}
