"use client";

import * as React from "react";
import { useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { Card } from "../ui/card";

export function Calendar() {
  const [selectedDay, setSelectedDay] = useState(10);

  const getDotColor = (day: number) => {
    if (day === 4) {
      return "bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.6)]";
    }
    if (day === 12) {
      return "bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.6)]";
    }
    if (day === 18) {
      return "bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.6)]";
    }
    if (day === 25) {
      return "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]";
    }
    return null;
  };

  return (
    <Card className="p-6 space-y-4 hover:shadow-[0_0_50px_rgba(6,182,212,0.25)] transition-shadow duration-300">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">July 2026</h3>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg hover:bg-white/5 text-[#94a3b8] hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-white/5 text-[#94a3b8] hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d} className="font-bold text-[#94a3b8] py-1">
            {d}
          </span>
        ))}
        {/* Leading offset days */}
        {[28, 29, 30].map((dayNum) => (
          <span
            key={dayNum}
            className="text-[#94a3b8]/20 py-1 flex items-center justify-center w-8 h-8 mx-auto text-xs"
          >
            {dayNum}
          </span>
        ))}
        {[...Array(31)].map((_, i) => {
          const dayNum = i + 1;
          const isSelected = selectedDay === dayNum;
          const dotColor = getDotColor(dayNum);

          return (
            <button
              key={dayNum}
              onClick={() => setSelectedDay(dayNum)}
              className={cn(
                "relative py-1 font-semibold transition-all rounded-lg flex flex-col items-center justify-center w-8 h-8 mx-auto focus:outline-none",
                isSelected
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  : "text-white hover:bg-white/10",
              )}
            >
              <span className="text-xs leading-tight">{dayNum}</span>
              {!isSelected && dotColor && (
                <span className={cn("absolute bottom-1 w-1.5 h-1.5 rounded-full", dotColor)} />
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
