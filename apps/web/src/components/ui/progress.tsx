"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName }: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5",
        className,
      )}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clampedValue}%` }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className={cn(
          "h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full",
          indicatorClassName,
        )}
      />
    </div>
  );
}
